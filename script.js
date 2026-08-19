// === MOTS DE PASSE ===
const MOT_DE_PASSE = "ceai2026";
const MOT_DE_PASSE_ADMIN = "ceaiadmin2026";
const MONTANT_COTISATION = 2000;

// === DONNÉES ===
let membres = JSON.parse(localStorage.getItem("ceai_membres")) || [];
let sessions = JSON.parse(localStorage.getItem("ceai_sessions")) || {};
let sessionActuelle = localStorage.getItem("ceai_sessionActuelle") || "";
let conseil = JSON.parse(localStorage.getItem("ceai_conseil")) || [];
let depensesAutorise = false;

// === CONNEXION ===
function seConnecter() {
  const saisi = document.getElementById("passwordInput").value;
  if (saisi === MOT_DE_PASSE) {
    document.getElementById("loginScreen").classList.add("cache");
    document.getElementById("sitePrincipal").classList.remove("cache");
    mettreAJourAffichageGlobal();
  } else {
    document.getElementById("erreurMdp").textContent = "Mot de passe incorrect";
  }
}
function deconnexion() {
  document.getElementById("loginScreen").classList.remove("cache");
  document.getElementById("sitePrincipal").classList.add("cache");
  document.getElementById("passwordInput").value = "";
  document.getElementById("erreurMdp").textContent = "";
  document.getElementById("optionsMenu").classList.remove("ouvert");
}

// === ACCÈS DÉPENSES ===
function ouvrirDepenses() {
  document.getElementById("verifDepensesScreen").classList.remove("cache");
}
function fermerVerifDepenses() {
  document.getElementById("verifDepensesScreen").classList.add("cache");
  document.getElementById("mdpDepenses").value = "";
}
function verifierDepenses() {
  const mdp = document.getElementById("mdpDepenses").value;
  if (mdp === MOT_DE_PASSE_ADMIN) {
    depensesAutorise = true;
    fermerVerifDepenses();
    document.getElementById("blocDepenses").classList.remove("cache");
    afficherDepensesSession();
  } else {
    document.getElementById("erreurDep").textContent = "Accès refusé";
  }
}

// === MENU ===
function toggleMenu() {
  document.getElementById("optionsMenu").classList.toggle("ouvert");
}
function afficherSection(nom) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(`sec-${nom}`).classList.add("active");
  document.getElementById("optionsMenu").classList.remove("ouvert");
  document.getElementById("blocDepenses").classList.add("cache");
  depensesAutorise = false;
}

// === SAUVEGARDE ===
function sauvegarder() {
  localStorage.setItem("ceai_membres", JSON.stringify(membres));
  localStorage.setItem("ceai_sessions", JSON.stringify(sessions));
  localStorage.setItem("ceai_sessionActuelle", sessionActuelle);
  localStorage.setItem("ceai_conseil", JSON.stringify(conseil));
}

// === DÉTECTION DE DOUBLONS ===
function membreExisteDeja(nom, tel) {
  return membres.some(m => 
    m.nom.trim().toLowerCase() === nom.trim().toLowerCase() || 
    (tel && m.tel && m.tel.trim() === tel.trim())
  );
}

// === AJOUTER MEMBRE PAR ADMIN ===
function ajouterMembreAdmin() {
  const nom = document.getElementById("nomMembreAdmin").value.trim();
  const tel = document.getElementById("telMembreAdmin").value.trim();
  const date = document.getElementById("dateAdhesionAdmin").value.trim();
  if (!nom) return alert("Veuillez saisir le nom et prénom");
  if (membres.length >= 10) return alert("Maximum 10 membres atteint !");
  if (membreExisteDeja(nom, tel)) return alert("ERREUR : Ce membre existe déjà !");
  membres.push({ id: Date.now(), nom, tel, dateAdhesion: date });
  sauvegarder();
  document.getElementById("nomMembreAdmin").value = "";
  document.getElementById("telMembreAdmin").value = "";
  document.getElementById("dateAdhesionAdmin").value = "";
  mettreAJourAffichageGlobal();
  alert("Membre ajouté avec succès !");
}

// === ADHÉSION PAR LE SITE ===
function soumettreAdhesion() {
  const nom = document.getElementById("nomAdherent").value.trim();
  const tel = document.getElementById("telAdherent").value.trim();
  const date = document.getElementById("dateAdhesion").value.trim();
  const msg = document.getElementById("msgAdhesion");
  if (!nom) return msg.textContent = "⚠️ Veuillez saisir votre nom et prénom";
  if (membreExisteDeja(nom, tel)) return msg.textContent = "⚠️ Vous êtes déjà membre !";
  if (membres.length >= 10) return msg.textContent = "⚠️ Maximum 10 membres atteint, l'adhésion est fermée.";
  membres.push({ id: Date.now(), nom, tel, dateAdhesion: date || new Date().toLocaleDateString("fr-FR") });
  sauvegarder();
  document.getElementById("nomAdherent").value = "";
  document.getElementById("telAdherent").value = "";
  document.getElementById("dateAdhesion").value = "";
  mettreAJourAffichageGlobal();
  msg.textContent = "✅ Adhésion enregistrée avec succès ! Bienvenue à CEAI.";
}

// === CHANGER DE SESSION ===
function changerSession() {
  const saisie = document.getElementById("sessionMois").value.trim();
  if (!saisie) return alert("Veuillez indiquer la session du mois");
  sessionActuelle = saisie;
  if (!sessions[sessionActuelle]) {
    sessions[sessionActuelle] = { cloture: false, versements: {}, depenses: [] };
  }
  sauvegarder();
  mettreAJourAffichageSession();
}

// === ENREGISTRER UN VERSEMENT ===
function enregistrerVersement() {
  if (!sessionActuelle) return alert("Validez d'abord la session du mois");
  const idMembre = document.getElementById("selectionMembreCot").value;
  const montant = parseInt(document.getElementById("montantVerse").value) || 0;
  if (!idMembre) return alert("Sélectionnez un membre");
  if (sessions[sessionActuelle].cloture) return alert("Ce mois est clôturé, modification impossible");
  sessions[sessionActuelle].versements[idMembre] = (sessions[sessionActuelle].versements[idMembre] || 0) + montant;
  sauvegarder();
  document.getElementById("montantVerse").value = "";
  mettreAJourAffichageSession();
}

// === CLÔTURER LE MOIS ===
function cloturerMois() {
  if (!sessionActuelle) return alert("Aucune session sélectionnée");
  if (!confirm("Confirmer la clôture définitive de ce mois ? Aucune modification ne sera plus possible.")) return;
  sessions[sessionActuelle].cloture = true;
  sauvegarder();
  mettreAJourAffichageSession();
}

// === ENREGISTRER UNE DÉPENSE ===
function enregistrerDepense() {
  if (!sessionActuelle) return alert("Validez d'abord la session du mois");
  if (sessions[sessionActuelle].cloture) return alert("Mois clôturé");
  const montant = parseInt(document.getElementById("montantDepense").value) || 0;
  const projet = document.getElementById("projetConcerne").value.trim();
  if (!montant || !projet) return alert("Remplissez tous les champs");
  sessions[sessionActuelle].depenses.push({ montant, projet, date: new Date().toLocaleDateString("fr-FR") });
  sauvegarder();
  document.getElementById("montantDepense").value = "";
  document.getElementById("projetConcerne").value = "";
  afficherDepensesSession();
}
function afficherDepensesSession() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return;
  const liste = sessions[sessionActuelle].depenses;
  document.getElementById("listeDepenses").innerHTML = liste.length === 0
    ? "<p>Aucune dépense enregistrée</p>"
    : liste.map(d => `<div class="ligne-depense"><span>${d.projet}</span><span>${d.montant.toLocaleString("fr-FR")} F · ${d.date}</span></div>`).join("");
}

// === EXPORTER RELEVÉ ===
function exporterReleve() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return alert("Aucune session à exporter");
  const s = sessions[sessionActuelle];
  let txt = `RELEVÉ CEAI — ${sessionActuelle}\n${'='.repeat(40)}\n`;
  txt += `Date d'édition : ${new Date().toLocaleString("fr-FR")}\nStatut : ${s.cloture ? "CLÔTURÉ" : "OUVERT"}\n\nCOTISATIONS :\n`;
  membres.forEach(m => {
    const verse = s.versements[m.id] || 0;
    const reste = Math.max(0, MONTANT_COTISATION - verse);
    txt += `- ${m.nom} : ${verse.toLocaleString("fr-FR")} F / ${MONTANT_COTISATION} F`;
    txt += reste > 0 ? ` · Reste : ${reste.toLocaleString("fr-FR")} F` : " · PAYÉ";
    txt += "\n";
  });
  if (s.depenses.length) {
    txt += "\nDÉPENSES & RÉALISATIONS :\n";
    s.depenses.forEach(d => txt += `- ${d.projet} : ${d.montant.toLocaleString("fr-FR")} F (${d.date})\n`);
  }
  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `CEAI-Releve-${sessionActuelle.replace(/\s+/g,"-")}.txt`;
  a.click();
}

// === PAIEMENT : AFFICHER LES COMPTES ===
function afficherComptesPaiement() {
  const nom = document.getElementById("nomPayeur").value.trim();
  const montant = document.getElementById("montantAPayer").value.trim();
  if (!nom || !montant) return alert("Remplissez le nom et le montant");
  document.getElementById("infosPaiement").classList.remove("cache");
}

// === MEMBRES DU CONSEIL ===
let tempPhoto = "";
function chargerPhotoConseil(e) {
  const reader = new FileReader();
  reader.onload = ev => { tempPhoto = ev.target.result; };
  reader.readAsDataURL(e.target.files[0]);
}
function ajouterMembreConseil() {
  const nom = document.getElementById("nomConseil").value.trim();
  if (!nom) return alert("Indiquez le nom");
  conseil.push({ id: Date.now(), nom, photo: tempPhoto || "" });
  sauvegarder();
  document.getElementById("nomConseil").value = "";
  tempPhoto = "";
  mettreAJourConseil();
}
function mettreAJourConseil() {
  document.getElementById("conseilMembres").innerHTML = conseil.map(m => `
    <div class="bloc-membre-conseil">
      <img src="${m.photo || 'https://via.placeholder.com/70?text=CEAI'}" alt="${m.nom}" />
      <div><strong>${m.nom}</strong></div>
    </div>
  `).join("");
}

// === CALCUL CAPITAL ===
function calculerCapital() {
  let total = 0;
  Object.values(sessions).forEach(s => {
    Object.values(s.versements).forEach(v => total += v);
  });
  return total;
}

// === MISES À JOUR GLOBALES ===
function mettreAJourAffichageGlobal() {
  document.getElementById("capitalGlobal").textContent = calculerCapital().toLocaleString("fr-FR") + " F CFA";
  document.getElementById("nbMembres").textContent = membres.length;
  document.getElementById("sessionEnCours").textContent = sessionActuelle || "—";
  
  // Liste admin
  document.getElementById("listeMembresAdmin").innerHTML = membres.map(m => `
    <div class="ligne-membre"><span><strong>${m.nom}</strong> ${m.tel ? "· " + m.tel : ""} ${m.dateAdhesion ? "· Adhésion : " + m.dateAdhesion : ""}</span>
    <button class="btn-suppr" onclick="supprimerMembre(${m.id})">Retirer</button></div>
  `).join("");

  // Sélection membre cotisation
  document.getElementById("selectionMembreCot").innerHTML = `<option value="">-- Choisir un membre --</option>` +
    membres.map(m => `<option value="${m.id}">${m.nom}</option>`).join("");

  mettreAJourConseil();
}

function supprimerMembre(id) {
  if (!confirm("Confirmer le retrait ?")) return;
  membres = membres.filter(m => m.id !== id);
  sauvegarder();
  mettreAJourAffichageGlobal();
}

// === MISE À JOUR SESSION ===
function mettreAJourAffichageSession() {
  if (!sessionActuelle || !sessions[sessionActuelle]) return;
  const s = sessions[sessionActuelle];
  document.getElementById("titreSession").textContent = `Tableau des cotisations — ${sessionActuelle} ${s.cloture ? "🔒 (Clôturé)" : ""}`;
  
  document.getElementById("tableauVersements").innerHTML = membres.length === 0
    ? "<p>Aucun membre enregistré</p>"
    : membres.map(m => {
        const verse = s.versements[m.id] || 0;
        const reste = Math.max(0, MONTANT_COTISATION - verse);
        let statut, classe;
        if (verse === 0) { statut = "En attente"; classe = "statut-attente"; }
        else if (reste > 0) { statut = `Reste : ${reste.toLocaleString("fr-FR")} F`; classe = "statut-partiel"; }
        else { statut = "Payé"; classe = "statut-paye"; }
        return `<div class="ligne-versement"><div><strong>${m.nom}</strong><br>Versé : ${verse.toLocaleString("fr-FR")} F / ${MONTANT_COTISATION} F</div><div class="${classe}">${statut}</div></div>`;
      }).join("");

  // Liste des mois clôturés
  document.getElementById("moisClotures").innerHTML = Object.entries(sessions)
    .filter(([,v]) => v.cloture)
    .map(([nom]) => `<div class="ligne-membre"><span>🔒 ${nom}</span><button onclick="exporterRelevePour('${nom}')">Télécharger</button></div>`)
    .join("");

  afficherDepensesSession();
}

function exporterRelevePour(nomSession) {
  sessionActuelle = nomSession;
  mettreAJourAffichageSession();
  exporterReleve();
}

// === INIT ===
window.onload = function() {
  document.getElementById("passwordInput").addEventListener("keypress", e => e.key==="Enter" && seConnecter());
  document.getElementById("mdpDepenses").addEventListener("keypress", e => e.key==="Enter" && verifierDepenses());
  mettreAJourAffichageGlobal();
  if (sessionActuelle) {
    document.getElementById("sessionMois").value = sessionActuelle;
    mettreAJourAffichageSession();
  }
};

// === GESTION DES PHOTOS DES FONDATEURS ===
let photoEnAttente = "";

function chargerPhotoFondateur(e) {
  const reader = new FileReader();
  reader.onload = ev => {
    photoEnAttente = ev.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
}

function enregistrerPhotoFondateur() {
  const choix = document.getElementById("selectionFondateur").value;
  if (!choix) return alert("Sélectionnez d'abord un fondateur");
  if (!photoEnAttente) return alert("Choisissez une photo");
  document.getElementById(`photo-${choix}`).src = photoEnAttente;
  // Sauvegarder dans le stockage
  localStorage.setItem(`ceai_photo_fondateur_${choix}`, photoEnAttente);
  alert("Photo enregistrée !");
  photoEnAttente = "";
}

// Restaurer les photos au chargement
window.addEventListener("load", function() {
  for (let i = 1; i <= 5; i++) {
    const sauvegardee = localStorage.getItem(`ceai_photo_fondateur_${i}`);
    if (sauvegardee) {
      document.getElementById(`photo-${i}`).src = sauvegardee;
    }
  }
});
