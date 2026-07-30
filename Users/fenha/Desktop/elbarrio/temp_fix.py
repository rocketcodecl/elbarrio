import sys
sys.dont_write_bytecode = True

filepath = "/Users/fenha/Desktop/elbarrio/src/screens/Onboarding.jsx"

with open(filepath, "rb") as f:
    data = f.read()

print("End bytes:", repr(data[-10:]))
print("Start bytes:", repr(data[:10]))

modified = False

# Remove trailing quote
if data.endswith(b'"\n'):
    data = data[:-2] + b'\n'
    modified = True
    print("Fixed: trailing quote removed")
elif data.endswith(b'"'):
    data = data[:-1]
    modified = True
    print("Fixed: trailing quote removed (no newline)")

# Remove leading quote
if data.startswith(b'"'):
    data = data[1:]
    modified = True
    print("Fixed: leading quote removed")

if modified:
    with open(filepath, "wb") as f:
        f.write(data)
    print("Done - file written")
else:
    print("No modifications needed")

print("New end:", repr(data[-10:]))
print("New start:", repr(data[:10]))