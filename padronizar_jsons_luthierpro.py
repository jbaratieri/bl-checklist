import os
import json

base_dir = "assets/extras/albuns"

for pasta in os.listdir(base_dir):
    pasta_caminho = os.path.join(base_dir, pasta)
    if not os.path.isdir(pasta_caminho):
        continue

    json_path = os.path.join(pasta_caminho, f"{pasta}.json")
    if not os.path.exists(json_path):
        print(f"⚠️  Nenhum JSON encontrado em {pasta}")
        continue

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Se o JSON já estiver padronizado
        if isinstance(data, dict) and "images" in data:
            print(f"✅ {pasta}.json já está padronizado.")
            continue

        # Se for lista simples, converte
        if isinstance(data, list):
            data = {"images": data}

        # Ajusta caminhos e normaliza campos
        novas_imgs = []
        for i, img in enumerate(data.get("images", []), start=1):
            full = img.get("full", "")
            thumb = img.get("thumb", "")
            # Remove "./" se existir
            full = full.replace("./", "")
            thumb = thumb.replace("./", "")
            novas_imgs.append({
                "thumb": thumb,
                "full": full,
                "alt": f"Imagem {i} da seção {pasta}"
            })

        data = {"images": novas_imgs}

        # Sobrescreve o JSON padronizado
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"🧩 {pasta}.json padronizado com sucesso ({len(novas_imgs)} imagens).")

    except Exception as e:
        print(f"❌ Erro em {pasta}.json: {e}")

print("\n✅ Todos os JSONs processados e padronizados.")
