import requests

url = "http://127.0.0.1:5000/read-file"
files = {"file": open("20221106_210143.wav", "rb")}

response = requests.post(url, files=files)
print(response.json())