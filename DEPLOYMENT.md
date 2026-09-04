# Guide de Test et Déploiement

Ce document explique comment tester votre portfolio localement et comment le mettre en ligne.

## 1. Test Local (Sur votre ordinateur)

Puisque nous avons migré vers Firebase, vous n'avez plus besoin de lancer le serveur Python. Tout se passe dans le frontend.

### Étapes :
1.  **Installation des dépendances** :
    Ouvrez un terminal dans le dossier du projet et lancez :
    ```bash
    npm install
    ```

2.  **Lancement de l'application** :
    ```bash
    npm start
    ```
    L'application sera disponible sur `http://localhost:3000`.

3.  **Test de l'administration** :
    *   Cliquez sur le cadenas.
    *   Connectez-vous avec votre compte Google (`seouldream903@gmail.com`).
    *   Modifiez une donnée et cliquez sur "SAVE_TO_CLOUD".
    *   Rafraîchissez la page : les données doivent persister car elles sont stockées sur Firebase.

---

## 2. Mise en ligne (Déploiement)

Votre application est maintenant une application statique (React SPA). Vous pouvez l'héberger gratuitement sur **Vercel** ou **Netlify**.

### Option recommandée : Vercel
1.  Poussez votre code sur un dépôt **GitHub**.
2.  Connectez-vous sur [Vercel.com](https://vercel.com).
3.  Cliquez sur "Add New" > "Project".
4.  Importez votre dépôt GitHub.
5.  Vercel détectera automatiquement qu'il s'agit d'un projet React. Cliquez sur **Deploy**.

---

## 3. Étape CRUCIALE : Autoriser votre domaine sur Firebase

Pour que la connexion Google fonctionne sur votre site en ligne, vous devez autoriser le nouveau domaine dans la console Firebase.

1.  Allez sur la [Console Firebase](https://console.firebase.google.com/).
2.  Sélectionnez votre projet : `gen-lang-client-0816963036`.
3.  Allez dans **Authentication** > onglet **Settings** > **Authorized domains**.
4.  Cliquez sur "Add domain" et ajoutez l'URL de votre site (ex: `votre-portfolio.vercel.app`).

---

## 4. Nettoyage (Merge)

Si vous utilisez Git :
1.  `git add .`
2.  `git commit -m "Migration vers Firebase et sécurisation par Google Auth"`
3.  `git push origin main` (ou votre branche de travail).

**Note importante** : Le fichier `src/firebase-applet-config.json` contient vos clés publiques Firebase. C'est normal et sécurisé car nous avons configuré des **Security Rules** sur Firestore qui vérifient votre identité côté serveur.
