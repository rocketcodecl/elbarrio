# fix_quotes.py
import os

filepath = os.path.join(os.path.dirname(__file__), 'src', 'screens', 'Onboarding.jsx')

with open(filepath, 'rb') as f:
    data = f.read()

print('End bytes:', repr(data[-10:]))
print('Start bytes:', repr(data[:10]))

# Remove trailing quote
if data.endswith(b'"\n'):
    data = data[:-2] + b'\n'
    print('Fixed: trailing quote removed')
elif data.endswith(b'"'):
    data = data[:-1]
    print('Fixed: trailing quote removed (no newline)')

# Remove leading quote
if data.startswith(b'"'):
    data = data[1:]
    print('Fixed: leading quote removed')

with open(filepath, 'wb') as f:
    f.write(data)

print('New end:', repr(data[-10:]))
print('New start:', repr(data[:10]))