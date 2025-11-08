
import os
import sys
import time
import hashlib
from typing import List, Dict, Any

from flask import Flask, request, jsonify

# Make sure local src/ is importable when running this script from emulator/
HERE = os.path.dirname(__file__)
SRC_PATH = os.path.join(HERE, "src")
if SRC_PATH not in sys.path:
	sys.path.insert(0, SRC_PATH)

from browser_emulator import BrowserEmulator

app = Flask(__name__)


def _compute_user_hash(username: str, cookies: List[Dict[str, Any]]) -> str:
	"""Compute a deterministic hash for the logged-in user.

	We sort cookies by name and concatenate name=value pairs, then hash
	username + '|' + cookie_string using SHA256.
	This provides a stable identifier that changes when cookies (session)
	change.
	"""
	cookie_parts = []
	for c in sorted(cookies, key=lambda x: x.get("name") or ""):
		name = c.get("name") or ""
		value = c.get("value") or ""
		cookie_parts.append(f"{name}={value}")
	cookie_str = ";".join(cookie_parts)
	payload = f"{username}|{cookie_str}".encode("utf-8")
	return hashlib.sha256(payload).hexdigest()


@app.route("/login", methods=["POST"])
def login() -> Any:
	"""Accept JSON body with 'username' and 'password'.

	Returns JSON { user_hash: str, cookies_count: int } on success.
	"""
	data = request.get_json(force=True, silent=True) or {}
	username = data.get("username") or request.form.get("username")
	password = data.get("password") or request.form.get("password")
	headless = bool(data.get("headless", True))

	if not username or not password:
		return jsonify({"error": "username and password are required"}), 400

	be = BrowserEmulator(headless=headless)
	try:
		be.start()
		# visit login page
		page = be.visit("https://ebridge.xjtlu.edu.cn")
		# Fill username/password fields. Keep this robust: try several selectors.
		try:
			page.get_by_label("Username").fill(username)
		except Exception:
			try:
				page.fill("input[name=Username]", username)
			except Exception:
				try:
					page.fill("input[name=username]", username)
				except Exception:
					pass

		try:
			page.get_by_label("Password").fill(password)
		except Exception:
			try:
				page.fill("input[name=Password]", password)
			except Exception:
				try:
					page.fill("input[type=password]", password)
				except Exception:
					pass

		# Try to submit: prefer clicking a button, otherwise press Enter
		submitted = False
		try:
			# Common button labels: Sign in, Log in, Login
			for label in ("Sign in", "Sign In", "Log in", "Log In", "Login", "Submit"):
				try:
					btn = page.get_by_role("button", name=label)
					btn.click()
					submitted = True
					break
				except Exception:
					pass
		except Exception:
			pass

		if not submitted:
			try:
				page.keyboard.press("Enter")
			except Exception:
				# best effort
				pass

		# wait a short time for navigation / auth to complete
		time.sleep(2)

		cookies = be.get_cookies()
		user_hash = _compute_user_hash(username, cookies)
		return jsonify({"user_hash": user_hash, "cookies_count": len(cookies)})

	except Exception as e:
		return jsonify({"error": str(e)}), 500

	finally:
		try:
			be.stop()
		except Exception:
			pass


if __name__ == "__main__":
	# For local testing only (development server)
	# Run: python emulator/ebridge.py
	port = int(os.environ.get("EBRIDGE_PORT", "8000"))
	app.run(host="0.0.0.0", port=port, debug=False)