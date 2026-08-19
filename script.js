// =====================================================
// CONFIGURATION FIREBASE
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, 
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLLaCYpJpuZIWLALs3YxTf_-WqB4nP03Y",
  authDomain: "ceai-5ff2a.firebaseapp.com",
  databaseURL: "https://ceai-5ff2a-default-rtdb.firebaseio.com",
  projectId: "ceai-5ff2a",
  storageBucket: "ceai-5ff2a.firebasestorage.app",
  messagingSenderId: "340494575762",
  appId: "1:340494575762:web:fc6e538d64c97a67651e4b"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =====================================================
// PARAMETRES
// =====================================================
const MOT_DE_PASSE_ADMIN = "ceaiadmin2026";
const QUOTA_MIN = 500;
const EMAIL_CONCEPTEUR = "atchou.olivier@exemple.com"; // Remplacez par votre email

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

// Liste des fondateurs par defaut
const FONDATEURS_DEFAUT = [
  { id: 1, nom: "ATCHOU Basile", photo: "" },
  { id: 2, nom: "KASSEIGNE Charles", photo: "" },
  { id: 3, nom: "ATCHOU Jules", photo: "" },
  { id: 4, nom: "AKPA Emile", photo: "" },
  { id: 5, nom: "ATCHOU Olivier", photo: "" }
];
let fondateurs = [...FONDATEURS_DEFAUT];

// =====================================================
// SURVEILLER LA CONNEXION
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
  
  if (!nom || !email || mdp.length < 6) 
    return erreur.textContent = "Remplissez tous les champs (6 caracteres minimum pour le mot de passe)";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, mdp);
    await setDoc(doc(db, "utilisateurs", cred.user.uid), {
      nom, email, dateInscription: serverTimestamp()
    });
    erreur.textContent = "Compte cree ! Connexion en cours...";
  } catch (e) {
    erreur.textContent = traduireErreur(e.code);
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
    erreur.textContent = traduireErreur(e.code);
  }
};

// =====================================================
// TRADUCTION DES ERREURS
// =====================================================
function traduireErreur(code) {
  const t = {
    "auth/email-already-in-use": "Cet email est deja utilise",
    "auth/user-not-found": "Aucun compte trouve avec cet email",
    "auth/wrong-password": "Mot de passe incorrect",
    "auth/invalid-email": "Adresse email invalide",
    "auth/weak-password": "Mot de passe trop faible (6 caracteres minimum)"
  };
  return t[code] || "Erreur de connexion. Reessayez.";
}

// =====================================================
// DECONNEXION
// =====================================================
window.deconnexion = async function () {
  await signOut(auth);
  accesAdmin = false;
  document.getElementById("connEmail").value = "";
  document.getElementById("connMdp").value = "";
  document.getElementById("authErreur").textContent = "";
  document.getElementById("inscErreur").textContent = "";
  mettreAJourVisibiliteAdmin();
};

// =====================================================
// CHARGER TOUTES LES DONNEES DEPUIS FIREBASE
// =====================================================
async function chargerDonneesFirebase() {
  try {
    const docMembres = await getDoc(doc(db, "ceai_data", "membres"));
    if (docMembres.exists()) membres = docMembres.data().liste || [];

    const docSessions = await getDoc(doc(db, "ceai_data", "sessions"));
    if (docSessions.exists()) sessions = docSessions.data() || {};

    const docSession = await getDoc(doc(db, "ceai_data", "session_actuelle"));
    if (docSession.exists()) sessionActuelle = docSession.data().nom || "";

    const docPubs = await getDoc(doc(db, "ceai_data", "publications"));
    if (docPubs.exists()) publications = docPubs.data().liste || [];

    const docNotifs = await getDoc(doc(db, "ceai_data", "notifications"));
    if (docNotifs.exists()) notifications = docNotifs.data().liste || [];

    const docFonds = await getDoc(doc(db, "ceai_data", "fondateurs"));
    if (docFonds.exists() && docFonds.data().liste) fondateurs = docFonds.data().liste;

    mettreAJourListeMembresSelect();
  } catch (e) {
    console.error("Erreur de chargement :", e);
  }
}

// =====================================================
// SAUVEGARDER LES DONNEES
// =====================================================
async function sauvegarder(type) {
  try {
    switch(type) {
      case "membres":
        await setDoc(doc(db, "ceai_data", "membres"), { liste: membres }); break;
      case "sessions":
        await setDoc(doc(db, "ceai_data", "sessions"), sessions); break;
      case "session_actuelle":
        await setDoc(doc(db, "ceai_data", "session_actuelle"), { nom: sessionActuelle }); break;
      case "publications":
        await setDoc(doc(db, "ceai_data", "publications"), { liste: publications }); break;
      case "notifications":
        await setDoc(doc(db, "ceai_data", "notifications"), { liste: notifications }); break;
      case "fondateurs":
        await setDoc(doc(db, "ceai_data", "fondateurs"), { liste: fondateurs }); break;
    }
  } catch (e) {
    console.error("Erreur de sauvegarde :", e);
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
  document.getElementById(`sec-${nom}`).classList.add("active");
  document.getElementById("optionsMenu").classList.remove("ouvert");
  document.getElementById("blocDepenses").classList.add("cache");
  mettreAJourPublicationsAccueil();
  afficherListeFondateurs();
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
// GESTION DE LA VISIBILITE ADMINISTRATEUR
// =====================================================
function mettreAJourVisibiliteAdmin() {
  const elementsAdmin = document.querySelectorAll(".zone-admin");
  if (accesAdmin) {
    elementsAdmin.forEach(el => el.classList.remove("cache"));
  } else {
    elementsAdmin.forEach(el => el.classList.add("cache"));
  }
}

// =====================================================
// OUVERTURE ESPACE ADMINISTRATEUR
// =====================================================
window.ouvrirEspaceAdmin = function () {
  document.getElementById("adminVerifScreen").classList.remove("cache");
  document.querySelector("#adminVerifScreen h2").textContent = "Acces Administrateur";
};

window.fermerVerifAdmin = function () {
  document.getElementById("adminVerifScreen").classList.add("cache");
  document.getElementById("mdpAdminVerif").value = "";
  document.getElementById("erreurAdmin").textContent = "";
};

window.verifierAdmin = async function () {
  const saisi = document.getElementById("mdpAdminVerif").value;
  if (saisi === MOT_DE_PASSE_ADMIN) {
    accesAdmin = true;
    fermerVerifAdmin();
    mettreAJourVisibiliteAdmin();
    alert("Acces administrateur valide. Vous pouvez gerer les membres et cloturer les mois.");
  } else {
    document.getElementById("erreurAdmin").textContent = "Acces refuse";
  }
};

// =====================================================
// AJOUTER UN MEMBRE — UNIQUEMENT ADMIN
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
  
  membres.push({ id: Date.now(), nom, tel, dateAdhesion: date });
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
  
  membres.push({ id: Date.now(), nom, tel, dateAdhesion: date || new Date().toLocaleDateString("fr-FR") });
  await sauvegarder("membres");
  
  document.getElementById("nomAdherent").value = "";
  document.getElementById("telAdherent").value = "";
  document.getElementById("dateAdhesion").value = "";
  msg.textContent = "Adhesion enregistree avec succes. Bienvenue a CEAI.";
  mettreAJourAffichageGlobal();
  mettreAJourListeMembresSelect();
};

// =====================================================
// SESSION ET QUOTA MENSUEL
// =====================================================
window.changerSession = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");

  const saisie = document.getElementById("sessionMois").value.trim();
  const quota = parseInt(document.getElementById("quotaMois").value);
  
  if (!saisie) return alert("Indiquez la session du mois");
  if (!quota || quota < QUOTA_MIN) return alert(`Le quota doit etre au minimum ${QUOTA_MIN} F CFA`);
  
  sessionActuelle = saisie;
  if (!sessions[sessionActuelle]) {
    sessions[sessionActuelle] = { 
      cloture: false, 
      versements: {}, 
      depenses: [],
      quota: quota,
      capitalMois: 0
    };
  } else {
    if (sessions[sessionActuelle].cloture) return alert("Ce mois est cloture, modification impossible");
    sessions[sessionActuelle].quota = quota;
  }
  
  await sauvegarder("session_actuelle");
  await sauvegarder("sessions");
  mettreAJourAffichageSession();
};

// =====================================================
// ENREGISTRER UN VERSEMENT
// =====================================================
window.enregistrerVersement = async function () {
  if (!sessionActuelle) return alert("Validez d'abord la session du mois");
  const s = sessions[sessionActuelle];
  if (s.cloture) return alert("Ce mois est cloture, modification impossible");
  
  const idMembre = document.getElementById("selectionMembreCot").value;
  const montant = parseInt(document.getElementById("montantVerse").value) || 0;
  if (!idMembre) return alert("Selectionnez un membre");
  if (!montant || montant <= 0) return alert("Indiquez un montant valide");

  const membre = membres.find(m => m.id == idMembre);
  s.versements[idMembre] = (s.versements[idMembre] || 0) + montant;
  s.capitalMois = (s.capitalMois || 0) + montant;

  notifications.unshift({
    id: Date.now(),
    nom: membre ? membre.nom : "Membre inconnu",
    montant: montant,
    date: new Date().toLocaleString("fr-FR"),
    session: sessionActuelle
  });
  if (notifications.length > 20) notifications.pop();

  await sauvegarder("sessions");
  await sauvegarder("notifications");
  
  document.getElementById("montantVerse").value = "";
  mettreAJourAffichageSession();
  mettreAJourAffichageGlobal();
};

// =====================================================
// CLOTURE DU MOIS — UNIQUEMENT ADMIN
// =====================================================
window.demanderCloture = function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  if (!sessionActuelle) return alert("Aucune session selectionnee");
  
  if (confirm(`Confirmer la cloture definitive de « ${sessionActuelle} » ?\nLe capital sera sauvegarde et remis a zero au prochain mois.\nAucune modification ne sera plus possible.`)) {
    cloturerMoisFinal();
  }
};

async function cloturerMoisFinal() {
  sessions[sessionActuelle].cloture = true;
  sessions[sessionActuelle].capitalMois = sessions[sessionActuelle].capitalMois || 0;
  await sauvegarder("sessions");
  
  mettreAJourAffichageSession();
  alert(`Mois « ${sessionActuelle} » cloture. Le capital a ete sauvegarde.`);
}

// =====================================================
// DEPENSES
// =====================================================
window.enregistrerDepense = async function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  if (!sessionActuelle) return alert("Validez d'abord la session");
  const s = sessions[sessionActuelle];
  if (s.cloture) return alert("Mois cloture");
  
  const montant = parseInt(document.getElementById("montantDepense").value) || 0;
  const projet = document.getElementById("projetConcerne").value.trim();
  if (!montant || !projet) return alert("Remplissez tous les champs");
  
  s.depenses.push({ montant, projet, date: new Date().toLocaleDateString("fr-FR") });
  await sauvegarder("sessions");
  
  document.getElementById("montantDepense").value = "";
  document.getElementById("projetConcerne").value = "";
  afficherDepensesSession();
};

function afficherDepensesSession() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return;
  const liste = sessions[sessionActuelle].depenses;
  document.getElementById("listeDepenses").innerHTML = liste.length === 0
    ? "<p>Aucune depense enregistree</p>"
    : liste.map(d => `<div class="ligne-depense"><span>${d.projet}</span><span>${d.montant.toLocaleString("fr-FR")} F · ${d.date}</span></div>`).join("");
}

window.ouvrirDepenses = function () {
  if (!accesAdmin) return alert("Acces administrateur requis");
  document.getElementById("blocDepenses").classList.remove("cache");
  afficherDepensesSession();
};

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
  if (fichier) {
    if (fichier.size > 8 * 1024 * 1024) return alert("Fichier de 8 Mo maximum");
    const refFichier = ref(storage, `publications/${Date.now()}_${fichier.name}`);
    const result = await uploadBytes(refFichier, fichier);
    urlFichier = await getDownloadURL(result.ref);
  }

  publications.unshift({
    id: Date.now(), auteur: utilisateurCourant?.email || "Anonyme",
    date: new Date().toLocaleString("fr-FR"),
    url: urlFichier, type: fichier?.type || null, description
  });
  await sauvegarder("publications");
  document.getElementById("fichierPub").value = "";
  document.getElementById("descriptionPub").value = "";
  alert("Publie avec succes");
  mettreAJourPublicationsAccueil();
};

// =====================================================
// FONDATEURS
// =====================================================
function afficherListeFondateurs() {
  const conteneur = document.getElementById("listeFondateurs");
  conteneur.innerHTML = fondateurs.map(f => `
    <div class="carte-fondateur">
      <img src="${f.photo || 'https://via.placeholder.com/90?text='+f.nom.substring(0,2)}" alt="${f.nom}" />
      <h4>${f.nom}</h4>
    </div>
  `).join("");
}

// =====================================================
// MISES A JOUR AFFICHAGE
// =====================================================
function mettreAJourAffichageGlobal() {
  document.getElementById("nbMembres").textContent = membres.length;
  const capital = sessionActuelle && sessions[sessionActuelle] ? sessions[sessionActuelle].capitalMois || 0 : 0;
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
    `Cotisations — ${sessionActuelle} — Quota: ${quota.toLocaleString("fr-FR")} F ${s.cloture ? 'CLOTURE' : ''}`;
  
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

  document.getElementById("notificationsPaiement").innerHTML = notifications.slice(0,5).map(n => `
    <div class="ligne-notif">${n.nom} : ${n.montant.toLocaleString("fr-FR")} F — ${n.date}</div>
  `).join("") || "<p>Aucune notification</p>";

  mettreAJourAffichageGlobal();
}

function mettreAJourPublicationsAccueil() {
  const conteneur = document.getElementById("publicationsAccueil");
  if (!publications.length) {
    conteneur.innerHTML = "<p class='note'>Aucune publication pour l'instant</p>"; return;
  }
  conteneur.innerHTML = publications.map(pub => `
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
}

// =====================================================
// EXPORT RELEVE
// =====================================================
window.exporterReleve = function () {
  if (!sessionActuelle || !sessions[sessionActuelle]) return alert("Aucune session");
  const s = sessions[sessionActuelle];
  const quota = s.quota || 0;
  let txt = `RELEVE CEAI — ${sessionActuelle}\n========================================\nQuota: ${quota.toLocaleString("fr-FR")} F\nCapital: ${(s.capitalMois||0).toLocaleString("fr-FR")} F\n\n`;
  membres.forEach(m => {
    const verse = s.versements[m.id]||0, reste = Math.max(0, quota - verse);
    txt += `- ${m.nom} : ${verse.toLocaleString("fr-FR")} F ${reste?`(Reste: ${reste.toLocaleString("fr-FR")} F)`:"PAYE"}\n`;
  });
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=`CEAI-${sessionActuelle}.txt`; a.click();
};
    
