from passlib.hash import bcrypt
import traceback

try:
    print(bcrypt.hash("123"))
except Exception as e:
    traceback.print_exc()
