with open("/Users/fenha/Desktop/elbarrio/src/screens/Onboarding.jsx", "rb") as f:
    data = f.read()

print("End bytes:", repr(data[-10:]))
print("Start bytes:", repr(data[:10]))

# Fix trailing quote
if data.endswith(b'"\n'):
    data = data[:-2] + b'\n'
    print("Fixed trailing quote")
elif data.endswith(b'"'):
    data = data[:-1]
    print("Fixed trailing quote (no newline)")

# Fix leading quote
if data.startswith(b'"'):
    data = data[1:]
    print("Fixed leading quote")

with open("/Users/fenha/Desktop/elbarrio/src/screens/Onboarding.jsx", "wb") as f:
    f.write(data)

print("Done")
print("New end:", repr(data[-10:]))