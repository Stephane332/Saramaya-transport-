# Publication de la version web - Saramaya Transport
#
# Ce fichier produit le LIEN : une adresse ouvrable depuis n'importe quel telephone,
# sans que votre PC reste allume, et sans passer par les stores. C'est aussi cette
# adresse qu'il faudra donner aux boutiques pour la politique de confidentialite.
#
# Usage : double-cliquez sur « publier.bat ».
#
# Il ne vous demande jamais vos identifiants : quand une connexion est necessaire,
# c'est l'outil officiel d'Expo qui la demande, dans sa propre invite.
#
# Note technique : on ne met PAS $ErrorActionPreference a 'Stop'. Sous Windows
# PowerShell, git, npm et eas ecrivent leur progression sur la sortie d'erreur meme
# quand tout va bien ; avec 'Stop', le script s'interromprait sur un simple message
# d'avancement. On controle donc explicitement $LASTEXITCODE apres chaque commande.

$ErrorActionPreference = 'Continue'
Set-Location -Path $PSScriptRoot

$BRANCHE = 'claude/salut-t175hl'
$EAS = 'eas-cli@latest'

function Titre($numero, $texte) {
    Write-Host ''
    Write-Host "[$numero/5] $texte" -ForegroundColor Cyan
}
function Bon($texte)    { Write-Host "      OK   $texte" -ForegroundColor Green }
function Note($texte)   { Write-Host "      -    $texte" -ForegroundColor DarkGray }
function Alerte($texte) { Write-Host "      !    $texte" -ForegroundColor Yellow }

function Abandonner($titre, $conseil) {
    Write-Host ''
    Write-Host "  ECHEC : $titre" -ForegroundColor Red
    Write-Host ''
    Write-Host "  $conseil" -ForegroundColor Yellow
    Write-Host ''
    Read-Host '  Appuyez sur Entree pour fermer'
    exit 1
}

Write-Host ''
Write-Host '  SARAMAYA TRANSPORT' -ForegroundColor Red
Write-Host '  Publication de la version web' -ForegroundColor DarkGray

# --- 1. Les outils ----------------------------------------------------------
Titre 1 'Verification des outils'
foreach ($outil in @('git', 'node', 'npm')) {
    if (-not (Get-Command $outil -ErrorAction SilentlyContinue)) {
        Abandonner "$outil est introuvable." `
            'Installez Node.js depuis https://nodejs.org et Git depuis https://git-scm.com, puis relancez ce fichier.'
    }
}
Bon "git, node $(node --version), npm $(npm --version)"

# --- 2. Le code le plus recent ----------------------------------------------
# On publie ce qui est sur GitHub, pas une copie locale vieille de trois jours :
# une adresse publique qui sert une version perimee est pire que pas d'adresse.
Titre 2 'Recuperation des dernieres corrections'
$GENERES = @('package-lock.json', 'tsconfig.json')
$aRemettre = @()
foreach ($fichier in $GENERES) {
    if (git status --porcelain -- $fichier) { $aRemettre += $fichier }
}
if ($aRemettre.Count -gt 0) {
    Note "Fichiers generes remis a l'etat de reference : $($aRemettre -join ', ')"
    git checkout -- $aRemettre
}

$brancheActuelle = (git branch --show-current)
if ($brancheActuelle) { $brancheActuelle = $brancheActuelle.Trim() }
if ($brancheActuelle -ne $BRANCHE) {
    Note "Passage de « $brancheActuelle » a « $BRANCHE »"
    git checkout $BRANCHE
    if ($LASTEXITCODE -ne 0) {
        Abandonner "Impossible de passer sur la branche $BRANCHE." `
            'Enregistrez ou annulez vos modifications locales, puis relancez.'
    }
}

$reussi = $false
foreach ($attente in @(0, 2, 4, 8, 16)) {
    if ($attente -gt 0) {
        Note "Nouvel essai dans $attente secondes..."
        Start-Sleep -Seconds $attente
    }
    git pull origin $BRANCHE
    if ($LASTEXITCODE -eq 0) { $reussi = $true; break }
}
if (-not $reussi) {
    Abandonner 'Impossible de recuperer les corrections depuis GitHub.' `
        'Verifiez votre connexion internet, puis relancez ce fichier.'
}

npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Abandonner "L'installation des dependances a echoue." `
        'Essayez :  Remove-Item -Recurse -Force node_modules   puis relancez ce fichier.'
}
Bon "A jour sur $BRANCHE"

# --- 3. Le compte Expo ------------------------------------------------------
#
# Gratuit, et il ne sert qu'a heberger : aucune donnee de voyageur n'y passe,
# puisque l'application n'envoie rien nulle part.
Titre 3 'Compte Expo'
Note 'Premiere fois : le telechargement de l''outil prend une minute.'

$compte = (npx $EAS whoami 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    Alerte 'Aucun compte connecte.'
    Note 'Creez-en un (gratuit) sur https://expo.dev, puis identifiez-vous ci-dessous.'
    Note 'Votre mot de passe est demande par l''outil d''Expo, et n''est vu que par lui.'
    Write-Host ''
    npx $EAS login
    if ($LASTEXITCODE -ne 0) {
        Abandonner 'Connexion au compte Expo impossible.' `
            'Verifiez vos identifiants sur https://expo.dev, puis relancez ce fichier.'
    }
    $compte = (npx $EAS whoami 2>&1 | Out-String).Trim()
}
Bon "Connecte : $compte"

# --- 4. Relier le depot au projet Expo --------------------------------------
#
# `eas init` inscrit un `projectId` dans app.json. C'est la seule valeur qui
# manquait au depot, parce qu'elle est propre au compte qui publie.
Titre 4 'Liaison du projet'
$config = Get-Content app.json -Raw -Encoding UTF8 | ConvertFrom-Json
$projectId = $config.expo.extra.eas.projectId
if (-not $projectId) {
    Note 'Premiere publication : creation du projet chez Expo.'
    npx $EAS init
    if ($LASTEXITCODE -ne 0) {
        Abandonner 'La liaison du projet a echoue.' `
            'Relancez ce fichier. Si le probleme persiste, envoyez le message ci-dessus a Claude.'
    }
    $config = Get-Content app.json -Raw -Encoding UTF8 | ConvertFrom-Json
    $projectId = $config.expo.extra.eas.projectId

    Alerte 'app.json a change : il porte maintenant le projectId.'
    Note 'Pensez a l''enregistrer sur GitHub :  git add app.json ; git commit -m "projectId EAS" ; git push'
}
Bon "Projet relie ($projectId)"

# --- 5. Verifier, construire, publier ---------------------------------------
#
# La verification vient AVANT la publication, et non apres : une adresse publique
# qui sert une version cassee, c'est pire que pas d'adresse du tout.
Titre 5 'Verification, construction et publication'
Note 'Quelques minutes. La verification passe en premier, expres.'
Write-Host ''

npm run web:publier
if ($LASTEXITCODE -ne 0) {
    Abandonner 'La publication a echoue.' `
        "Si le message ci-dessus vient des controles, ne publiez pas : envoyez-le a Claude. C'est precisement ce que ces controles servent a attraper."
}

Write-Host ''
Write-Host '  PUBLIE' -ForegroundColor Green
Write-Host ''
Write-Host '  L''adresse s''affiche ci-dessus, apres « Production ».' -ForegroundColor Green
Write-Host '  Ouvrez-la sur l''iPhone, puis Partager > Sur l''ecran d''accueil :' -ForegroundColor DarkGray
Write-Host '  l''application s''installe avec son icone, sans App Store.' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Deux limites de la version web, pour ne pas etre surpris :' -ForegroundColor DarkGray
Write-Host '   - la lecture automatique de la CNIB n''y fonctionne pas (module natif) ;' -ForegroundColor DarkGray
Write-Host '   - les rappels de depart non plus.' -ForegroundColor DarkGray
Write-Host '  Pour les avoir :  npx eas-cli@latest build -p android --profile preview' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  L''adresse de la politique de confidentialite, a donner aux boutiques,' -ForegroundColor DarkGray
Write-Host '  est cette meme adresse suivie de /confidentialite' -ForegroundColor DarkGray
Write-Host ''
Read-Host '  Appuyez sur Entree pour fermer'
