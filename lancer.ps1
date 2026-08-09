# Lancement de l'application Siraba - Saramaya Transport
#
# Ce fichier fait tout ce qu'il faut pour demarrer proprement : il recupere les
# dernieres corrections, remet les dependances a niveau, verifie que rien n'est
# incoherent, puis lance le serveur qui affiche le QR code.
#
# Usage : double-cliquez sur « lancer.bat ».
#
# Note technique : on ne met PAS $ErrorActionPreference a 'Stop'. Sous Windows
# PowerShell, git et npm ecrivent leur progression sur la sortie d'erreur meme
# quand tout va bien ; avec 'Stop', le script s'interromprait sur un simple
# message d'avancement. On controle donc explicitement le code de retour
# ($LASTEXITCODE) apres chaque commande, ce qui est fiable dans tous les cas.

$ErrorActionPreference = 'Continue'
Set-Location -Path $PSScriptRoot

$BRANCHE = 'claude/salut-t175hl'

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
Write-Host '  SIRABA - Saramaya Transport' -ForegroundColor Red
Write-Host '  Preparation et lancement' -ForegroundColor DarkGray

# --- 1. Les outils sont-ils installes ? -------------------------------------
Titre 1 'Verification des outils'
foreach ($outil in @('git', 'node', 'npm')) {
    if (-not (Get-Command $outil -ErrorAction SilentlyContinue)) {
        Abandonner "$outil est introuvable." `
            'Installez Node.js depuis https://nodejs.org (il fournit node et npm) et Git depuis https://git-scm.com, puis relancez ce fichier.'
    }
}
Bon "git, node $(node --version), npm $(npm --version)"

# --- 2. Recuperer les dernieres corrections ---------------------------------
Titre 2 'Recuperation des dernieres corrections'

if (git status --porcelain) {
    Alerte 'Des fichiers ont ete modifies sur ce PC.'
    Note 'Ils sont conserves : ce script ne supprime jamais votre travail.'
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

# Le reseau peut flancher : on reessaie en espacant les tentatives.
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
Bon "A jour sur $BRANCHE"

# --- 3. Dependances ----------------------------------------------------------
Titre 3 'Mise a niveau des dependances'
Note 'Plusieurs minutes la premiere fois, quelques secondes ensuite.'
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Abandonner "L'installation des dependances a echoue." `
        'Essayez :  Remove-Item -Recurse -Force node_modules   puis relancez ce fichier.'
}
Bon 'Dependances installees'

# --- 4. Controles avant lancement -------------------------------------------
Titre 4 'Controles : versions, types, regles de calcul'
npm run verifier
if ($LASTEXITCODE -ne 0) {
    Abandonner 'Un controle a echoue - ne scannez pas le QR code.' `
        "Envoyez le message ci-dessus a Claude. C'est precisement ce que ces controles servent a attraper avant qu'un defaut atteigne votre telephone."
}
Bon 'Tout est coherent'

# --- 5. Lancement ------------------------------------------------------------
Titre 5 'Demarrage du serveur'
Write-Host ''
Write-Host '  Le QR code va apparaitre ci-dessous.' -ForegroundColor Green
Write-Host '  Scannez-le avec Expo Go. iPhone et PC sur le meme reseau' -ForegroundColor DarkGray
Write-Host '  (le partage de connexion du telephone convient).' -ForegroundColor DarkGray
Write-Host '  Pour arreter : Ctrl+C' -ForegroundColor DarkGray
Write-Host ''

npx expo start --clear
