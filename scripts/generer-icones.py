#!/usr/bin/env python3
"""
Génère le jeu d'icônes de l'application à partir du vrai logo Saramaya.

Le kangourou et son petit sont l'emblème de la compagnie. On l'isole du logo
officiel (assets/marque/saramaya-logo.png), on le recentre, et on le décline sur
les différents formats attendus par Expo (iOS, Android adaptatif, favicon, splash)
et par la version web (PWA, apple-touch).

Méthode d'extraction : le kangourou est rouge sur fond blanc. La couverture d'un
pixel par le rouge se lit sur le canal vert (rouge ≈ vert bas, blanc ≈ vert haut),
ce qui donne une transparence douce sans halo. Le tourbillon blanc dans la poche
devient naturellement un creux — le détail de l'emblème est conservé.

Réexécutable : python3 scripts/generer-icones.py
"""

from PIL import Image

SOURCE = "assets/marque/saramaya-logo.png"

ROUGE = (216, 31, 38)       # couleurs.marque
ROUGE_VIF = (240, 54, 47)   # couleurs.marqueVif
BLANC = (255, 255, 255)

# Boîte englobante du kangourou dans le logo (mesurée par projection des rouges).
BBOX = (126, 72, 253, 175)


def silhouette(couleur):
    """Renvoie une image RGBA du kangourou seul, recoloré, rognée au plus près."""
    src = Image.open(SOURCE).convert("RGBA")
    crop = src.crop(BBOX)
    w, h = crop.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sp = crop.load()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a < 40:
                continue
            # Couverture par le rouge, lue sur le canal vert.
            couv = (255 - g) / (255 - 45)
            couv = max(0.0, min(1.0, couv))
            if couv <= 0.02:
                continue
            op[x, y] = (couleur[0], couleur[1], couleur[2], int(couv * 255))
    return out.crop(out.getbbox())


def centroide(img):
    """Centre de masse horizontal (pondéré par l'alpha) — le kangourou a une queue
    fine à gauche et un corps lourd à droite, on équilibre sur la masse, pas la boîte."""
    px = img.load()
    w, h = img.size
    somme = 0.0
    sx = 0.0
    for y in range(h):
        for x in range(w):
            a = px[x, y][3]
            if a:
                somme += a
                sx += a * x
    return (sx / somme) if somme else w / 2


def composer(embleme, taille, marge, fond):
    """Place l'emblème sur un carré `taille`. Centrage horizontal sur la masse
    visible, vertical sur la boîte, avec `marge` minimale garantie sans rognage."""
    canevas = Image.new("RGBA", (taille, taille), fond if fond else (0, 0, 0, 0))
    dispo = int(taille * (1 - 2 * marge))
    ew, eh = embleme.size
    echelle = min(dispo / ew, dispo / eh)
    nw, nh = max(1, int(ew * echelle)), max(1, int(eh * echelle))
    redim = embleme.resize((nw, nh), Image.LANCZOS)

    cx = centroide(redim)
    # On vise le centroïde au centre, puis on borne pour ne rien rogner.
    gauche = round(taille / 2 - cx)
    bord = round(taille * 0.04)
    gauche = max(bord, min(gauche, taille - nw - bord))
    haut = (taille - nh) // 2
    canevas.alpha_composite(redim, (gauche, haut))
    return canevas


def png(img, chemin):
    img.save(chemin)
    print("écrit", chemin, img.size)


def main():
    blanc = silhouette(BLANC)
    rouge = silhouette(ROUGE_VIF)
    fond_rouge = ROUGE + (255,)

    # iOS + icône générale : kangourou blanc sur rouge.
    png(composer(blanc, 1024, 0.13, fond_rouge), "assets/icon.png")

    # Android adaptatif : premier plan blanc transparent (le rouge vient de app.json),
    # rentré dans la zone de sécurité centrale.
    png(composer(blanc, 1024, 0.20, None), "assets/adaptive-icon.png")
    png(composer(blanc, 1024, 0.20, None), "assets/android-icon-foreground.png")
    png(composer(blanc, 1024, 0.20, None), "assets/android-icon-monochrome.png")

    # Splash sombre (#0A070E) : kangourou rouge de marque, centré et aéré.
    png(composer(rouge, 1024, 0.32, None), "assets/splash-icon.png")

    # Favicon.
    png(composer(blanc, 64, 0.10, fond_rouge), "assets/favicon.png")

    # Web / PWA.
    png(composer(blanc, 180, 0.13, fond_rouge), "public/apple-touch-icon.png")
    png(composer(blanc, 192, 0.13, fond_rouge), "public/icone-192.png")
    png(composer(blanc, 512, 0.13, fond_rouge), "public/icone-512.png")


if __name__ == "__main__":
    main()
