import os
from PIL import Image
import json

base_dir = "assets/extras/imagens projeto"

# Função para converter imagem em .webp
def converter_para_webp(origem, destino, qualidade=80, largura_thumb=300):
    try:
        img = Image.open(origem).convert("RGB")

        # Versão FULL
        if "full" in destino:
            img.save(destino, "WEBP", quality=qualidade)
        # Versão THUMB
        elif "thumbs" in destino:
            ratio = largura_thumb / img.width
            nova_altura = int(img.height * ratio)
            thumb = img.resize((largura_thumb, nova_altura))
            thumb.save(destino, "WEBP", quality=qualidade)
    except Exception as e:
        print(f"❌ Erro em {origem}: {e}")

# Varre cada pasta de seção (ex: acab1, caixa2, etc.)
for pasta in os.listdir(base_dir):
    pasta_origem = os.path.join(base_dir, pasta)
    if not os.path.isdir(pasta_origem):
        continue

    pasta_full = os.path.join(pasta_origem, "full")
    pasta_thumbs = os.path.join(pasta_origem, "thumbs")
    os.makedirs(pasta_full, exist_ok=True)
    os.makedirs(pasta_thumbs, exist_ok=True)

    imagens = [f for f in os.listdir(pasta_origem)
               if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    dados_json = []
    contador = 1

    for imagem in imagens:
        nome_base = f"{pasta}-{contador:03d}.webp"
        caminho_origem = os.path.join(pasta_origem, imagem)
        destino_full = os.path.join(pasta_full, nome_base)
        destino_thumb = os.path.join(pasta_thumbs, nome_base)

        converter_para_webp(caminho_origem, destino_full)
        converter_para_webp(caminho_origem, destino_thumb)

        dados_json.append({
            "id": contador,
            "full": f"./full/{nome_base}",
            "thumb": f"./thumbs/{nome_base}",
            "alt": f"Imagem {contador} da seção {pasta}"
        })

        contador += 1

    # Gera o arquivo JSON
    json_path = os.path.join(pasta_origem, f"{pasta}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(dados_json, f, indent=2, ensure_ascii=False)

    print(f"✅ {pasta}: {len(imagens)} imagens convertidas e JSON criado.")
