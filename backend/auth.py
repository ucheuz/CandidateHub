import os
import jwt
import requests
from functools import wraps
from flask import request, jsonify, g
from firebase_admin import firestore

# --- CONFIGURATION ---
# It's highly recommended to use environment variables for these in production.
# These values come from your Azure AD App Registration.
TENANT_ID = os.environ.get("AZURE_TENANT_ID", "5dadcdcb-ea32-47fe-84b2-0f6cc63c2e0f")
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "197b2abb-77ba-424e-a94e-e3dc06d0eeb7")
# Accept both 'api://<client_id>' and '<client_id>' as valid audiences
AUDIENCES = [f"api://{CLIENT_ID}", CLIENT_ID]

# Microsoft's OpenID Connect metadata document
METADATA_URL = f"https://login.microsoftonline.com/{TENANT_ID}/v2.0/.well-known/openid-configuration"
# Accept both v1.0 and v2.0 issuer URLs
ISSUERS = [
    f"https://sts.windows.net/{TENANT_ID}/",
    f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"
]

# Cache for JWKS keys to avoid repeated network calls
jwks_cache = {}

def get_jwks():
    """
    Fetches the JSON Web Key Set (JWKS) from Microsoft's endpoint and caches it.
    These keys are used to verify the token's signature.
    """
    global jwks_cache
    if jwks_cache:
        return jwks_cache

    try:
        metadata_response = requests.get(METADATA_URL)
        metadata_response.raise_for_status()
        jwks_uri = metadata_response.json().get("jwks_uri")

        jwks_response = requests.get(jwks_uri)
        jwks_response.raise_for_status()
        jwks_cache = jwks_response.json()
        return jwks_cache
    except requests.exceptions.RequestException as e:
        print(f"Error fetching JWKS: {e}")
        return None

def get_signing_key(token):
    """
    Finds the correct public key from the JWKS to verify the token's signature.
    """
    jwks = get_jwks()
    if not jwks:
        return None

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError as e:
        print(f"JWT header decode error: {e}")
        return None
    
    rsa_key = {}
    for key in jwks["keys"]:
        if key["kid"] == unverified_header.get("kid"):
            rsa_key = { "kty": key["kty"], "kid": key["kid"], "use": key["use"], "n": key["n"], "e": key["e"] }
            break
    return rsa_key

def token_required(f):
    """
    A decorator to protect a Flask endpoint.
    It checks for a valid JWT in the 'Authorization: Bearer <token>' header.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"message": "Authorization header is missing or malformed"}), 401

        token = auth_header.split(" ")[1]
        signing_key = get_signing_key(token)

        if not signing_key:
            return jsonify({"message": "Could not find appropriate signing key"}), 401

        try:
            # Try all combinations of valid audiences and issuers
            last_error = None
            for aud in AUDIENCES:
                for iss in ISSUERS:
                    try:
                        payload = jwt.decode(
                            token,
                            signing_key,
                            algorithms=["RS256"],
                            audience=aud,
                            issuer=iss
                        )
                        g.user = payload
                        return f(*args, **kwargs)
                    except Exception as e:
                        last_error = e
            # If none of the combinations worked, return the last error
            if isinstance(last_error, jwt.ExpiredSignatureError):
                return jsonify({"message": "Token has expired"}), 401
            elif isinstance(last_error, (jwt.InvalidAudienceError, jwt.InvalidIssuerError)):
                return jsonify({"message": "Invalid token. Audience or issuer mismatch."}), 401
            else:
                return jsonify({"message": "Unable to parse authentication token", "error": str(last_error)}), 401
        except Exception as e:
            return jsonify({"message": "Unable to parse authentication token", "error": str(e)}), 401

    return decorated

def permission_required(allowed_permissions):
    """
    A decorator factory for Role-Based Access Control (RBAC).
    This should be applied *after* @token_required.
    It checks if the authenticated user's permission is in the list of allowed permissions.
    """
    if not isinstance(allowed_permissions, list):
        allowed_permissions = [allowed_permissions]

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # @token_required should have already run and populated g.user
            if not hasattr(g, 'user'):
                return jsonify({"message": "Authentication token is required for permission check."}), 401

            user_email = g.user.get("preferred_username")
            if not user_email:
                return jsonify({"message": "Could not identify user from token."}), 403

            db = firestore.client()
            users_ref = db.collection('users')
            user_docs = list(users_ref.where('email', '==', user_email).limit(1).stream())

            if not user_docs:
                return jsonify({"message": "User not found in system."}), 403

            user_profile = user_docs[0].to_dict()
            user_permission = user_profile.get('permissions')

            if user_permission not in allowed_permissions:
                return jsonify({"message": f"Access denied. Required permissions: {', '.join(allowed_permissions)}"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator