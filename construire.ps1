# Construction de l'application Android - Saramaya Transport
#
# Ce fichier produit un APK : l'application installable sur un telephone Android,
# sans passer par le Play Store. C'est aussi la SEULE facon de voir fonctionner la
# lecture de la CNIB par photo, qui demande un module natif absent d'Expo Go.
#
# Usage : double-cliquez sur « construire.bat ».
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
Write-Host '  Construction de l''application Android' -ForegroundColor DarkGray

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
# Un APK se distribue et s'installe : il doit porter le code le plus recent, pas
# une copie locale vieille de trois jours.
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

# --- 3. Les controles, AVANT de construire ----------------------------------
# Un APK se distribue : une fois installe chez quelqu'un, un defaut ne se retire
# plus d'un clic. Les controles passent donc avant, jamais apres.
Titre 3 'Controles : versions, types, regles de calcul'
npm run verifier
if ($LASTEXITCODE -ne 0) {
    Abandonner 'Un controle a echoue - ne construisez pas.' `
        "Envoyez le message ci-dessus a Claude. C'est precisement ce que ces controles servent a attraper avant qu'un defaut atteigne un telephone."
}
Bon 'Tout est coherent'

# --- 4. Le compte Expo ------------------------------------------------------
Titre 4 'Compte Expo'
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

$config = Get-Content app.json -Raw -Encoding UTF8 | ConvertFrom-Json
$projectId = $config.expo.extra.eas.projectId
if (-not $projectId) {
    Note 'Premiere construction : creation du projet chez Expo.'
    npx $EAS init
    if ($LASTEXITCODE -ne 0) {
        Abandonner 'La liaison du projet a echoue.' `
            'Relancez ce fichier. Si le probleme persiste, envoyez le message ci-dessus a Claude.'
    }
    Alerte 'app.json a change : il porte maintenant le projectId.'
    Note 'Pensez a l''enregistrer :  git add app.json ; git commit -m "projectId EAS" ; git push'
}

# --- 5. Construction --------------------------------------------------------
Titre 5 'Construction de l''APK'
Write-Host ''
Write-Host '  La construction a lieu sur les serveurs d''Expo, pas sur ce PC.' -ForegroundColor DarkGray
Write-Host '  Comptez 10 a 20 minutes. Vous pouvez fermer cette fenetre sans rien casser :' -ForegroundColor DarkGray
Write-Host '  le lien de telechargement restera sur https://expo.dev/accounts' -ForegroundColor DarkGray
Write-Host ''

npx $EAS build --platform android --profile preview
if ($LASTEXITCODE -ne 0) {
    Abandonner 'La construction a echoue.' `
        'Envoyez le message ci-dessus a Claude. Le journal complet est aussi consultable sur https://expo.dev'
}

Write-Host ''
Write-Host '  CONSTRUIT' -ForegroundColor Green
Write-Host ''
Write-Host '  Le lien de telechargement de l''APK s''affiche ci-dessus.' -ForegroundColor Green
Write-Host '  Ouvrez-le depuis le telephone Android pour installer l''application.' -ForegroundColor DarkGray
Write-Host '  Android demandera d''autoriser les « sources inconnues » : c''est normal' -ForegroundColor DarkGray
Write-Host '  pour une application qui ne vient pas du Play Store.' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Ce que cette version apporte, et qu''Expo Go ne peut pas :' -ForegroundColor DarkGray
Write-Host '   - la lecture automatique de la CNIB a partir d''une photo ;' -ForegroundColor DarkGray
Write-Host '   - les rappels de depart, de convocation et d''expiration.' -ForegroundColor DarkGray
Write-Host ''
Read-Host '  Appuyez sur Entree pour fermer'
