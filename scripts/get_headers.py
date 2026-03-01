import csv
import sys

filename = "C:/Users/pc/Downloads/Activities (5).csv"
try:
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        for i, h in enumerate(headers):
            print(f"{i}: {h}")
except Exception as e:
    print(f"Error: {e}")
