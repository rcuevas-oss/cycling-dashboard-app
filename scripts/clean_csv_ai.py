import csv
import re
import sys
from datetime import datetime

input_file = "C:/Users/pc/Downloads/Activities (5).csv"
output_file = "C:/Users/pc/Downloads/Activities_limpio_para_supabase.csv"

null_values = {"--", "—", "nan", "None"}
time_columns = {"Tiempo", "Tiempo en movimiento", "Tiempo transcurrido", "Mejor tiempo de vuelta"}

cleaned_comma_cols = set()
decimal_cols = set()
integer_cols = set()
nulls_generated = 0

def clean_val(val):
    return val.strip()

def is_numeric(val):
    if not val: return False
    # remove comma as thousand separator
    val = val.replace(',', '')
    try:
        float(val)
        return True
    except:
        return False

with open(input_file, 'r', encoding='utf-8-sig') as f:
    reader = list(csv.DictReader(f))
    fieldnames = reader[0].keys() if reader else []

# Process columns to see which ones are numeric
col_stats = {col: {'num_count': 0, 'total': 0, 'has_comma': False, 'is_float': False} for col in fieldnames}

for row in reader:
    for col in fieldnames:
        val = clean_val(str(row[col])) if row[col] else ""
        if val and val not in null_values and col not in time_columns and col != "Fecha" and col != "Título" and col != "Tipo de actividad" and col != "Favorito":
            col_stats[col]['total'] += 1
            if is_numeric(val):
                col_stats[col]['num_count'] += 1
                if ',' in val:
                    col_stats[col]['has_comma'] = True
                if '.' in val:
                    col_stats[col]['is_float'] = True

numeric_cols = set()
for col, stats in col_stats.items():
    if stats['total'] > 0 and (stats['num_count'] / stats['total']) > 0.8:
        numeric_cols.add(col)
        if stats['has_comma']:
            cleaned_comma_cols.add(col)
        if stats['is_float']:
            decimal_cols.add(col)
        else:
            integer_cols.add(col)

cleaned_rows = []
for row in reader:
    cleaned_row = {}
    for col in fieldnames:
        val = clean_val(str(row[col])) if row[col] else ""
        
        # B) Reemplazar Nulos
        if val in null_values or val == "":
            cleaned_row[col] = "" # Vacío para Supabase
            if val in null_values:
                nulls_generated += 1
            continue

        # E) Tiempo (Mantener intacto)
        if col in time_columns:
            cleaned_row[col] = val
            continue
            
        # D) Normalizar Fecha
        if col == "Fecha":
            parsed_date = None
            try:
                for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M", "%d/%m/%Y %H:%M"):
                    try:
                        parsed_date = datetime.strptime(val, fmt)
                        break
                    except ValueError:
                        pass
                if parsed_date:
                    cleaned_row[col] = parsed_date.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    cleaned_row[col] = val
            except:
                cleaned_row[col] = val
            continue
            
        # C) Numéricos (mantener punto, quitar coma en separador de miles)
        if col in numeric_cols:
            val_clean = val
            if col in cleaned_comma_cols:
                val_clean = val_clean.replace(',', '')
            try:
                f_val = float(val_clean)
                if f_val.is_integer() and '.' not in val_clean:
                    cleaned_row[col] = str(int(f_val))
                else:
                    cleaned_row[col] = str(f_val)
            except:
                cleaned_row[col] = val
            continue
            
        # Default
        cleaned_row[col] = val
        
    cleaned_rows.append(cleaned_row)

print("Escribiendo archivo limpio...")
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(cleaned_rows)

print("=== REPORTE_START ===")
print("cleaned_comma_cols:", list(cleaned_comma_cols))
print("decimal_cols:", list(decimal_cols))
print("integer_cols:", list(integer_cols))
print("nulls_generated:", nulls_generated)
print("=== REPORTE_END ===")
