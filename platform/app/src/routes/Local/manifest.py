import os
import json

# 📂 Your DICOM study folder path
study_folder_path = r"C:\Users\J\Viewers\platform\app\public\dicoms\Study_1.2.826.0.1.3680043.8.498.78610350547668740347851208464231767134"

# 📂 Public folder path (adjust if different)
public_folder_path = r"C:\Users\J\Viewers\platform\app\public"

# Recursively collect all .dcm files with relative paths from the study folder
dicom_files = []
for root, dirs, files in os.walk(study_folder_path):
    for file in files:
        if file.lower().endswith('.dcm'):
            full_path = os.path.join(root, file)
            relative_path = os.path.relpath(full_path, study_folder_path)
            dicom_files.append(relative_path)

# Save the list as manifest.json in the public folder
manifest_path = os.path.join(public_folder_path, 'dicom_files.json')
with open(manifest_path, 'w') as manifest_file:
    json.dump(dicom_files, manifest_file, indent=2)

print(f"✅ Created dicom_files.json in /public with {len(dicom_files)} DICOM files")
