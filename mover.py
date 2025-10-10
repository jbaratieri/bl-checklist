import os
import shutil

base_dir = "assets/extras/imagens projeto"

for pasta in os.listdir(base_dir):
    pasta_origem = os.path.join(base_dir, pasta)
    if not os.path.isdir(pasta_origem):
        continue

    pasta_originais = os.path.join(pasta_origem, "originais")
    os.makedirs(pasta_originais, exist_ok=True)

    for arquivo in os.listdir(pasta_origem):
        if arquivo.lower().endswith(('.jpg', '.jpeg', '.png')):
            origem = os.path.join(pasta_origem, arquivo)
            destino = os.path.join(pasta_originais, arquivo)
            shutil.move(origem, destino)
            print(f"📦 Movido: {arquivo} → {pasta}/originais/")

print("✅ Todas as imagens originais foram movidas para suas pastas /originais/.")
