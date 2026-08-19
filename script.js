// =====================================================
// CONFIGURATION FIREBASE — REALTIME DATABASE
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { 
  getDatabase, ref, set, get, child 
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLLaCYpJpuZIWLALs3YxTf_-WqB4nP03Y",
  authDomain: "ceai-5ff2a.firebaseapp.com",
  databaseURL: "https://ceai-5ff2a-default-rtdb.firebaseio.com",
  projectId: "ceai-5ff2a",
  storageBucket: "ceai-5ff2a.firebasestorage.app",
  messagingSenderId: "340494575762",
  appId: "1:340494575762:web:fc6e538d64c97a67651e4b"
};

// INITIALISATION
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// =====================================================
// PARAMETRES
// =====================================================
const MOT_DE_PASSE_ADMIN = "ceaiadmin2026";
const QUOTA_MIN = 500;
const EMAIL_CONCEPTEUR = "atchouolivier@email.com"; // Remplacez par votre email

// =====================================================
// ETAT GLOBAL
// =====================================================
let utilisateurCourant = null;
let membres = [];
let sessions = {};
let sessionActuelle = "";
let publications = [];
let notifications = [];
let accesAdmin = false;
let estConcepteur = false;

// =====================================================
// SURVEILLER ETAT DE CONNEXION
// =====================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    utilisateurCourant = user;
    estConcepteur = (user.email.toLowerCase() === EMAIL_CONCEPTEUR.toLowerCase());
    document.getElementById("authScreen").classList.add("cache");
    document.getElementById("sitePrincipal").classList.remove("cache");
    await chargerDonneesFirebase();
    mettreAJourAffichageGlobal();
    mettreAJourVisibiliteAdmin();
  } else {
    utilisateurCourant = null;
    accesAdmin = false;
    document.getElementById("authScreen").classList.remove("cache");
    document.getElementById("sitePrincipal").classList.add("cache");
  }
});

// =====================================================
// INSCRIPTION
// =====================================================
window.sInscrire = async function () {
  const nom = document.getElementById("inscNom").value.trim();
  const email = document.getElementById("inscEmail").value.trim();
  const mdp = document.getElementById("inscMdp").value;
  const erreur = document.getElementById("inscErreur");
  
  if (!nom || !email || mdp.length < 6) {
    erreur.textContent = "Remplissez tous les champs (6 caracteres minimum pour le mot de passe)";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, mdp);
    await set(ref(db, "utilisateurs/" + cred.user.uid), { nom, email });
    erreur.textContent = "Compte cree ! Connexion en cours...";
  } catch (e) {
    erreur.textContent = "Erreur : " + traduireErreurAuth(e.code);
  }
};

// =====================================================
// CONNEXION
// =====================================================
window.seConnecter = async function () {
  const email = document.getElementById("connEmail").value.trim();
  const mdp = document.getElementById("connMdp").value;
  const erreur = document.getElementById("authErreur");
  
  try {
    await signInWithEmailAndPassword(auth, email, mdp);
  } catch (e) {
    erreur.textContent = "Erreur : " + traduireErreurAuth(e.code);
  }
};

// =====================================================
// DECONNEXION
// =====================================================
window.deconnexion = async function () {
  await signOut(auth);
  accesAdmin = false;
  mettreAJourVisibiliteAdmin();
  viderChampsAuth();
};

function viderChampsAuth() {
  document.getElementById("connEmail").value = "";
  document.getElementById("connMdp").value = "";
  document.getElementById("authErreur").textContent = "";
  document.getElementById("inscErreur").textContent = "";
}

// =====================================================
// TRADUCTION ERREURS
// =====================================================
function traduireErreurAuth(code) {
  const erreurs = {
    "auth/email-already-in-use": "Cet email est deja utilise",
    "auth/invalid-email": "Email invalide",
    "auth/operation-not-allowed": "Operation non autorisee",
    "auth/weak-password": "Mot de passe trop faible (6 caracteres minimum)",
    "auth/user-disabled": "Compte desactive",
    "auth/user-not-found": "Aucun compte trouve",
    "auth/wrong-password": "Mot de passe incorrect",
    "auth/network-request-failed": "Verifiez votre connexion internet"
  };
  return erreurs[code] || "Une erreur est survenue";
}

// =====================================================
// CHARGER DONNEES
// =====================================================
async function chargerDonneesFirebase() {
  try {
    const dbRef = ref(db);
    
    const snapMembres = await get(child(dbRef, "membres"));
    if (snapMembres.exists()) membres = snapMembres.val() || [];

    const snapSessions = await get(child(dbRef, "sessions"));
    if (snapSessions.exists()) sessions = snapSessions.val() || {};

    const snapSession = await get(child(dbRef, "session_actuelle"));
    if (snapSession.exists()) sessionActuelle = snapSession.val() || "";

    const snapPubs = await get(child(dbRef, "publications"));
    if (snapPubs.exists()) publications = snapPubs.val() || [];

    const snapNotifs = await get(child(dbRef, "notifications"));
    if (snapNotifs.exists()) notifications = snapNotifs.val() || [];

    mettreAJourListeMembresSelect();
    mettreAJourAffichageSession();
    mettreAJourPublicationsAccueil();
  } catch (e) {
    console.error("Erreur chargement :", e);
    alert("Impossible de charger les donnees. Verifiez les regles Firebase.");
  }
}

// =====================================================
// SAUVEGARDER DONNEES
// =====================================================
async function sauvegarder(type) {
  try {
    switch(type) {
      case "membres": await set(ref(db, "membres"), membres); break;
      case "sessions": await set(ref(db, "sessions"), sessions); break;
      case "session_actuelle": await set(ref(db, "session_actuelle"), sessionActuelle); break;
      case "publications": await set(ref(db, "publications"), publications); break;
      case "notifications": await set(ref(db, "notifications"), notifications); break;
    }
  } catch (e) {
    console.error("Erreur sauvegarde :", e);
  }
}

// =====================================================
// MENU ET NAVIGATION
// =====================================================
window.toggleMenu = function () {
  document.getElementById("optionsMenu").classList.toggle("ouvert");
};

window.afficherSection = function (nom) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById("sec-" + nom).classList.add("active");
  document.getElementById("optionsMenu").classList.remove("ouvert");
  mettreAJourVisibiliteAdmin();
};

window.basculerInscription = function () {
  document.getElementById("connexionForm").classList.add("cache");
  document.getElementById("inscriptionForm").classList.remove("cache");
  document.getElementById("authTitre").textContent = "Inscription";
};

window.basculerConnexion = function () {
  document.getElementById("inscriptionForm").classList.add("cache");
  document.getElementById("connexionForm").classList.remove("cache");
  document.getElementById("authTitre").textContent = "Connexion";
};

// =====================================================
// GESTION AFFICHAGE ADMIN
// =====================================================
function mettreAJourVisibiliteAdmin() {
  document.querySelectorAll(".zone-admin").forEach(el => {
    accesAdmin ? el.classList.remove("cache") : el.classList.add("cache");
  });
}

window.ouvrirEspaceAdmin = function () {
  document.getElementById("adminVerifScreen").classList.remove("cache");
  document.querySelector("#adminVerifScreen h2").textContent = "Acces Administrateur";
};

window.fermerVerifAdmin = function () {
  document.getElementById("adminVerifScreen").classList.add("cache");
  document.getElementById("mdpAdminVerif").value = "";
  document.getElementById("erreurAdmin").textContent = "";
};

window.verifierAdmin = function () {
  const saisi = document.getElementById("mdpAdminVerif").value;
  if (saisi === MOT_DE_PASSE_ADMIN) {
    accesAdmin = true;
    fermerVerifAdmin();
    mettreAJourVisibiliteAdmin();
    alert("Acces administrateur valide.");
  } else {
    document.getElementById("erreurAdmin").textContent = "Mot de passe incorrect";
  }
};

// =====================================================
// AJOUTER MEMBRE — ADMIN SEUL
// =====================================================
function membreExisteDeja(nom, tel) {
  return membres.some(m => 
    m.nom.trim().toLowerCase() === nom.trim().toLowerCase() || 
    (tel && m.tel && m.tel.trim() === tel.trim())
  );
}

window.ajouterMembreAdmin = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");

  const nom = document.getElementById("nomMembreAdmin").value.trim();
  const tel = document.getElementById("telMembreAdmin").value.trim();
  const date = document.getElementById("dateAdhesionAdmin").value.trim();
  
  if (!nom) return alert("Saisissez le nom et prenom");
  if (membreExisteDeja(nom, tel)) return alert("Ce membre existe deja");

  membres.push({ id: Date.now(), nom, tel, date: date || new Date().toLocaleDateString("fr-FR") });
  await sauvegarder("membres");
  
  document.getElementById("nomMembreAdmin").value = "";
  document.getElementById("telMembreAdmin").value = "";
  document.getElementById("dateAdhesionAdmin").value = "";
  
  mettreAJourAffichageGlobal();
  mettreAJourListeMembresSelect();
  alert("Membre ajoute avec succes");
};

// =====================================================
// ADHESION PUBLIQUE
// =====================================================
window.soumettreAdhesion = async function () {
  const nom = document.getElementById("nomAdherent").value.trim();
  const tel = document.getElementById("telAdherent").value.trim();
  const date = document.getElementById("dateAdhesion").value.trim();
  const msg = document.getElementById("msgAdhesion");
  
  if (!nom) return msg.textContent = "Saisissez votre nom et prenom";
  if (membreExisteDeja(nom, tel)) return msg.textContent = "Vous etes deja membre";
  
  membres.push({ id: Date.now(), nom, tel, date: date || new Date().toLocaleDateString("fr-FR") });
  await sauvegarder("membres");
  
  document.getElementById("nomAdherent").value = "";
  document.getElementById("telAdherent").value = "";
  document.getElementById("dateAdhesion").value = "";
  
  msg.textContent = "Adhesion enregistree avec succes. Bienvenue a CEAI.";
  mettreAJourAffichageGlobal();
  mettreAJourListeMembresSelect();
};

// =====================================================
// GERER SESSION — ADMIN SEUL
// =====================================================
window.changerSession = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");

  const saisie = document.getElementById("sessionMois").value.trim();
  const quota = parseInt(document.getElementById("quotaMois").value);
  
  if (!saisie) return alert("Indiquez la session du mois");
  if (!quota || quota < QUOTA_MIN) return alert(`Le quota doit etre au minimum ${QUOTA_MIN} F CFA`);
  
  sessionActuelle = saisie;
  if (!sessions[sessionActuelle]) {
    sessions[sessionActuelle] = { cloture: false, versements: {}, depenses: [], quota: quota, capital: 0 };
  } else {
    if (sessions[sessionActuelle].cloture) return alert("Cette session est cloturee, modification impossible");
    sessions[sessionActuelle].quota = quota;
  }
  
  await sauvegarder("session_actuelle");
  await sauvegarder("sessions");
  mettreAJourAffichageSession();
  alert("Session mise a jour");
};

// =====================================================
// ENREGISTRER VERSEMENT
// =====================================================
window.enregistrerVersement = async function () {
  if (!sessionActuelle) return alert("Validez d'abord la session du mois");
  const s = sessions[sessionActuelle];
  if (s.cloture) return alert("Session cloturee, impossible de modifier");
  
  const idMembre = document.getElementById("selectionMembreCot").value;
  const montant = parseInt(document.getElementById("montantVerse").value) || 0;
  
  if (!idMembre) return alert("Selectionnez un membre");
  if (montant <= 0) return alert("Indiquez un montant valide");

  s.versements[idMembre] = (s.versements[idMembre] || 0) + montant;
  s.capital = Object.values(s.versements).reduce((a, b) => a + b, 0);

  const membre = membres.find(m => String(m.id) === String(idMembre));
  notifications.unshift({
    id: Date.now(),
    nom: membre ? membre.nom : "Membre inconnu",
    montant,
    date: new Date().toLocaleDateString("fr-FR"),
    session: sessionActuelle
  });
  if (notifications.length > 20) notifications.pop();

  await sauvegarder("sessions");
  await sauvegarder("notifications");
  
  document.getElementById("montantVerse").value = "";
  mettreAJourAffichageSession();
  mettreAJourAffichageGlobal();
  alert("Versement enregistre");
};

// =====================================================
// CLOTURER MOIS — ADMIN SEUL
// =====================================================
window.demanderCloture = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  if (!sessionActuelle) return alert("Aucune session selectionnee");
  
  if (confirm(`Confirmez-vous la cloture de « ${sessionActuelle} » ?\nAucune modification ne sera plus possible.`)) {
    sessions[sessionActuelle].cloture = true;
    await sauvegarder("sessions");
    mettreAJourAffichageSession();
    alert(`Session « ${sessionActuelle} » cloturee.`);
  }
};

// =====================================================
// DEPENSES
// =====================================================
window.ouvrirDepenses = function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  document.getElementById("blocDepenses").classList.remove("cache");
  afficherListeDepenses();
};

window.enregistrerDepense = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  if (!sessionActuelle) return alert("Validez d'abord la session");
  const s = sessions[sessionActuelle];
  if (s.cloture) return alert("Session cloturee");
  
  const montant = parseInt(document.getElementById("montantDepense").value) || 0;
  const projet = document.getElementById("projetConcerne").value.trim();
  
  if (!montant || !projet) return alert("Remplissez tous les champs");
  
  s.depenses.push({ montant, projet, date: new Date().toLocaleDateString("fr-FR") });
  await sauvegarder("sessions");
  
  document.getElementById("montantDepense").value = "";
  document.getElementById("projetConcerne").value = "";
  afficherListeDepenses();
};

function afficherListeDepenses() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return;
  const liste = sessions[sessionActuelle].depenses;
  document.getElementById("listeDepenses").innerHTML = liste.length === 0
    ? "<p>Aucune depense enregistree</p>"
    : liste.map(d => `<div class="ligne-depense"><span>${d.projet}</span><span>${d.montant.toLocaleString("fr-FR")} F · ${d.date}</span></div>`).join("");
}

// =====================================================
// PAIEMENT
// =====================================================
window.afficherComptesPaiement = function () {
  const nom = document.getElementById("nomPayeur").value.trim();
  const montant = document.getElementById("montantAPayer").value;
  if (!nom || !montant) return alert("Remplissez nom et montant");
  document.getElementById("infosPaiement").classList.remove("cache");
};

window.confirmerPaiementDeclare = async function () {
  const nom = document.getElementById("nomPayeur").value.trim();
  const montant = parseInt(document.getElementById("montantAPayer").value);
  const msg = document.getElementById("msgPaiement");
  
  notifications.unshift({
    id: Date.now(), nom, montant,
    date: new Date().toLocaleDateString("fr-FR"),
    session: sessionActuelle || "Non specifiee",
    statut: "En attente de validation"
  });
  if (notifications.length > 20) notifications.pop();
  await sauvegarder("notifications");

  msg.innerHTML = `Merci ${nom} !<br>Versement de ${montant.toLocaleString("fr-FR")} F enregistre en attente de validation.`;
  document.getElementById("infosPaiement").classList.add("cache");
  document.getElementById("nomPayeur").value = "";
  document.getElementById("montantAPayer").value = "";
};

// =====================================================
// PUBLICATIONS
// =====================================================
window.publier = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");

  const fichier = document.getElementById("fichierPub").files[0];
  const description = document.getElementById("descriptionPub").value.trim();
  if (!fichier && !description) return alert("Ajoutez un fichier ou un texte");

  let urlFichier = null;
  let typeFichier = null;

  if (fichier) {
    if (fichier.size > 100 * 1024 * 1024) return alert("Fichier trop grand (100 Mo maximum)");

    try {
      const formData = new FormData();
      formData.append("file", fichier);
      formData.append("upload_preset", "ml_default");
      formData.append("cloud_name", "tlp5kk6r");

      let typeUpload = fichier.type.startsWith("video") ? "video" : "image";

      const reponse = await fetch(
        "https://api.cloudinary.com/v1_1/tlp5kk6r/" + typeUpload + "/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const resultat = await reponse.json();

      if (resultat.error) {
        alert("Erreur upload : " + resultat.error.message);
        return;
      }

      urlFichier = resultat.secure_url;
      typeFichier = fichier.type;

    } catch (erreur) {
      alert("Erreur lors de l'envoi du fichier. Verifiez votre connexion.");
      return;
    }
  }

  publications.unshift({
    id: Date.now(),
    auteur: utilisateurCourant?.email || "Anonyme",
    date: new Date().toLocaleString("fr-FR"),
    url: urlFichier,
    type: typeFichier,
    description
  });

  await sauvegarder("publications");

  document.getElementById("fichierPub").value = "";
  document.getElementById("descriptionPub").value = "";
  alert("Publie avec succes !");
  mettreAJourPublicationsAccueil();
};

// =====================================================
// MISES A JOUR AFFICHAGE
// =====================================================
function mettreAJourAffichageGlobal() {
  document.getElementById("nbMembres").textContent = membres.length;
  const capital = sessionActuelle && sessions[sessionActuelle] ? sessions[sessionActuelle].capital || 0 : 0;
  document.getElementById("capitalGlobal").textContent = capital.toLocaleString("fr-FR") + " F CFA";
  document.getElementById("sessionEnCours").textContent = sessionActuelle || "Non definie";
}

function mettreAJourListeMembresSelect() {
  const sel = document.getElementById("selectionMembreCot");
  sel.innerHTML = `<option value="">-- Choisir un membre --</option>` +
    membres.map(m => `<option value="${m.id}">${m.nom}</option>`).join("");
}

function mettreAJourAffichageSession() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return;
  const s = sessions[sessionActuelle];
  const quota = s.quota || 0;
  
  document.getElementById("titreSession").textContent = 
    `Cotisations — ${sessionActuelle} — Quota: ${quota.toLocaleString("fr-FR")} F ${s.cloture ? 'CLOTUREE' : ''}`;
  
  document.getElementById("tableauVersements").innerHTML = membres.map(m => {
    const verse = s.versements[m.id] || 0;
    const reste = Math.max(0, quota - verse);
    const statut = reste === 0 ? "statut-paye" : verse > 0 ? "statut-partiel" : "statut-attente";
    return `<div class="ligne-versement">
      <span><strong>${m.nom}</strong></span>
      <span>${verse.toLocaleString("fr-FR")} / ${quota.toLocaleString("fr-FR")} F</span>
      <span>${reste > 0 ? `Reste: ${reste.toLocaleString("fr-FR")} F` : "PAYE"}</span>
      <span class="${statut}">${reste === 0 ? "PAYE" : verse > 0 ? "EN COURS" : "EN ATTENTE"}</span>
    </div>`;
  }).join("");

  document.getElementById("notificationsPaiement").innerHTML = notifications.slice(0, 5).map(n => `
    <div class="ligne-notif">${n.nom} : ${n.montant.toLocaleString("fr-FR")} F — ${n.date}</div>
  `).join("") || "<p>Aucune notification</p>";

  mettreAJourAffichageGlobal();
}

function mettreAJourPublicationsAccueil() {
  const conteneur = document.getElementById("publicationsAccueil");
  const listePub = document.getElementById("listePublications");
  
  if (!publications.length) {
    conteneur.innerHTML = "<p class='note'>Aucune publication pour l'instant</p>";
    if (listePub) listePub.innerHTML = "<p class='note'>Aucune publication pour l'instant</p>";
    return;
  }

  const html = publications.map(pub => `
    <div class="carte-publication">
      ${pub.url ? (pub.type?.startsWith('video') 
        ? `<video controls src="${pub.url}" style="max-height:250px;"></video>` 
        : `<img src="${pub.url}" alt="Publication" />`) : ''}
      <div class="contenu-pub">
        <p>${pub.description || ''}</p>
        <p class="date-pub">${pub.date}</p>
      </div>
    </div>
  `).join("");

  conteneur.innerHTML = html;
  if (listePub) listePub.innerHTML = html;
}

// =====================================================
// EXPORT RELEVE
// =====================================================
window.exporterReleve = function () {
  if (!sessionActuelle || !sessions[sessionActuelle]) return alert("Aucune session selectionnee");
  const s = sessions[sessionActuelle];
  const quota = s.quota || 0;
  let texte = `RELEVE CEAI — ${sessionActuelle}\n========================================\nQuota: ${quota.toLocaleString("fr-FR")} F CFA\nCapital total: ${(s.capital||0).toLocaleString("fr-FR")} F CFA\n\n`;
  
  membres.forEach(m => {
    const verse = s.versements[m.id] || 0;
    const reste = Math.max(0, quota - verse);
    texte += `- ${m.nom} : ${verse.toLocaleString("fr-FR")} F CFA ${reste > 0 ? `(Reste: ${reste.toLocaleString("fr-FR")} F CFA)` : "PAYE"}\n`;
  });

  if (s.depenses?.length) {
    texte += "\n--- DEPENSES ---\n";
    s.depenses.forEach(d => texte += `- ${d.projet} : ${d.montant.toLocaleString("fr-FR")} F CFA (${d.date})\n`);
  }

  const fichier = new Blob([texte], { type: "text/plain" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `CEAI-Releve-${sessionActuelle.replace(/\s+/g, '-')}.txt`;
  lien.click();
};
    
