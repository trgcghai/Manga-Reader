import os
import zipfile

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

def create_cbz_from_parent(parent_dir):
    parent_dir = os.path.abspath(parent_dir)
    cbz_dir = os.path.join(parent_dir, "cbz")
    os.makedirs(cbz_dir, exist_ok=True)

    for folder_name in sorted(os.listdir(parent_dir)):
        folder_path = os.path.join(parent_dir, folder_name)

        if not os.path.isdir(folder_path):
            continue
        if folder_name == "cbz":
            continue

        images = sorted([
            f for f in os.listdir(folder_path)
            if f.lower().endswith(IMAGE_EXTS)
        ])

        if not images:
            print(f"⚠️ Bỏ qua {folder_name} (không có ảnh)")
            continue

        cbz_path = os.path.join(cbz_dir, f"{folder_name}.cbz")

        with zipfile.ZipFile(cbz_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for img in images:
                img_path = os.path.join(folder_path, img)
                zipf.write(img_path, arcname=img)

        print(f"✅ Đã tạo {folder_name}.cbz")

if __name__ == "__main__":
    parent_folder = input("Nhập đường dẫn folder_parent: ").strip()
    create_cbz_from_parent(parent_folder)