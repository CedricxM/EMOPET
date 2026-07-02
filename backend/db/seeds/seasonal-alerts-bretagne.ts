/**
 * Seasonal Alerts — Bretagne (annual patterns)
 *
 * Known annual health concerns for dogs in Bretagne region.
 * These are seeded once and refreshed yearly.
 * Content uses {dog_name}, {breed_name}, {fur_length} placeholders.
 */

export const SEASONAL_ALERTS_BRETAGNE = [
  // ── Chenilles processionnaires (Feb-Apr) ─────────────────────────
  {
    alertType: 'chenilles_processionnaires',
    region: 'bretagne',
    severity: 'urgent' as const,
    titleFr: 'Chenilles processionnaires : danger pour {dog_name}',
    bodyFr: 'Les chenilles processionnaires descendent des pins en ce moment. Leurs poils sont extrêmement urticants et peuvent provoquer de vives réactions chez les chiens qui les reniflent ou les lèchent. Évitez les zones de pins et de cèdres pendant vos promenades avec {dog_name}. Si vous repérez un nid (amas blanc soyeux dans les branches), changez de chemin. En cas de contact — salivation excessive, langue gonflée, agitation soudaine — rincez abondamment la zone touchée à l\'eau claire sans frotter et consultez un vétérinaire en urgence. Ne tentez pas de faire vomir {dog_name}.',
    activeFrom: '2026-02-15',
    activeTo: '2026-04-30',
    source: 'fredon_bretagne',
  },

  // ── Épillets (Jun-Sep) ───────────────────────────────────────────
  {
    alertType: 'epillets',
    region: 'bretagne',
    severity: 'attention' as const,
    titleFr: 'Épillets : vérifiez {dog_name} après chaque promenade',
    bodyFr: 'Les épillets sont des graminées sèches en forme de flèche qui se fichent dans le pelage, les oreilles, les narines et entre les doigts. Ils progprésente sous la peau et ne ressortent pas seuls. Après chaque promenade dans les herbes hautes ou sèches, inspectez les pattes (entre chaque doigt), les oreilles, le ventre et les aisselles de {dog_name}. Un chien qui secoue la tête soudainement, éternue de façon répétée ou lèche une patte sans arrêt peut avoir un épillet. Retirez ceux que vous voyez en surface avec une pince à épiler. Pour ceux déjà enfoncés, consultez rapidement.',
    activeFrom: '2026-06-01',
    activeTo: '2026-09-30',
    source: 'ordre_veterinaires',
  },

  // ── Tiques (Mar-Nov, pic Apr-Jun) ────────────────────────────────
  {
    alertType: 'tiques',
    region: 'bretagne',
    severity: 'attention' as const,
    titleFr: 'Saison des tiques : vigilance pour {dog_name}',
    bodyFr: 'Les tiques sont actives dès que la température dépasse 5°C. Elles se trouvent dans les herbes hautes, les sous-bois et les fougères — des terrains que {dog_name} adore explorer. Après chaque promenade en nature, passez vos mains dans le pelage en insistant derrière les oreilles, autour du cou, entre les doigts, sous les aisselles et autour de la queue. Si vous trouvez une tique, retirez-la avec un tire-tique en tournant dans le sens inverse des aiguilles d\'une montre, sans tirer. Ne mettez jamais de produit dessus avant de la retirer. Conservez la tique retirée quelques jours dans un morceau de scotch, au cas où.',
    activeFrom: '2026-03-01',
    activeTo: '2026-11-30',
    source: 'anses',
  },

  // ── Cyanobactéries (Jul-Sep) ─────────────────────────────────────
  {
    alertType: 'cyanobacteries',
    region: 'bretagne',
    severity: 'urgent' as const,
    titleFr: 'Algues toxiques en eau douce : protéger {dog_name}',
    bodyFr: 'En été, certains plans d\'eau douce de Bretagne développent des cyanobactéries (algues bleu-vert) qui sont extrêmement dangereuses pour les chiens. L\'eau prend une teinte verdâtre ou présente des amas en surface. Ne laissez JAMAIS {dog_name} boire ou se baigner dans une eau qui semble trouble, verdâtre ou mousseuse. Les intoxications aux cyanobactéries peuvent être fatales en quelques heures. Privilégiez les plans d\'eau surveillés et vérifiez les arrêtés de baignade de votre commune avant toute sortie au bord de l\'eau. En cas de contact, rincez immédiatement {dog_name} à l\'eau claire.',
    activeFrom: '2026-07-01',
    activeTo: '2026-09-30',
    source: 'ars_bretagne',
  },

  // ── Feux d'artifice 14 juillet ───────────────────────────────────
  {
    alertType: 'feux_artifice',
    region: 'all',
    severity: 'attention' as const,
    titleFr: 'Feux d\'artifice : préparer {dog_name}',
    bodyFr: 'Les feux d\'artifice du 14 juillet peuvent être très inquiétants pour les chiens. L\'ouïe de {dog_name} est bien plus sensible que la nôtre — les détonations sont pour lui assourdissantes. Gardez {dog_name} à l\'intérieur pendant les festivités. Fermez volets et fenêtres, mettez une musique douce ou la télévision pour atténuer les bruits extérieurs. Proposez-lui un endroit calme où se réfugier — sous un meuble, dans son panier avec une couverture. Ne le forcez pas à sortir et ne le grondez pas s\'il a réaction d’évitement : c\'est une réaction normale. Votre calme est sa meilleure ressource. Promenez-le bien avant le début des festivités.',
    activeFrom: '2026-07-12',
    activeTo: '2026-07-16',
    source: 'emopet',
  },

  // ── Feux d'artifice Nouvel An ────────────────────────────────────
  {
    alertType: 'feux_artifice',
    region: 'all',
    severity: 'attention' as const,
    titleFr: 'Réveillon : protéger {dog_name} du bruit',
    bodyFr: 'Les pétards et feux d\'artifice du Nouvel An sont une source de réaction d’évitement pour beaucoup de chiens. Comme pour le 14 juillet, anticipez : promenez {dog_name} avant la tombée de la nuit, puis gardez-le en sécurité à l\'intérieur. Fermez les ouvertures, proposez un espace refuge confortable et restez calme — votre sérénité rassure {dog_name}. Si votre chien est particulièrement sensible aux bruits forts, préparez un jouet d\'occupation (Kong fourré, tapis de léchage) pour détourner son attention. Ne le laissez pas seul ce soir-là si possible. La présence rassurante de sa famille est ce qu\'il y a de mieux.',
    activeFrom: '2026-12-30',
    activeTo: '2027-01-02',
    source: 'emopet',
  },

  // ── Canicule (Jun-Aug) ───────────────────────────────────────────
  {
    alertType: 'canicule',
    region: 'all',
    severity: 'urgent' as const,
    titleFr: 'Chaleur : {dog_name} a besoin de précautions',
    bodyFr: 'Par forte chaleur, promenez {dog_name} tôt le matin (avant 8h) ou tard le soir (après 20h). Testez le bitume avec le dos de votre main pendant 5 secondes : si c\'est trop chaud pour vous, c\'est trop chaud pour ses coussinets. Laissez toujours de l\'eau fraîche à disposition, en plusieurs points de la maison. Ne laissez JAMAIS {dog_name} dans une voiture, même vitres ouvertes, même à l\'ombre — la température peut monter à 50°C en 20 minutes. Les signes d\'inconfort lié à la chaleur : halètement excessif, bave épaisse, démarche titubante. Si cela arrive, mouillez {dog_name} progressivement avec de l\'eau tiède (pas glacée) et consultez rapidement.',
    activeFrom: '2026-06-15',
    activeTo: '2026-08-31',
    source: 'meteo_france',
  },

  // ── Chocolat Noël ────────────────────────────────────────────────
  {
    alertType: 'chocolat',
    region: 'all',
    severity: 'attention' as const,
    titleFr: 'Fêtes de fin d\'année : attention au chocolat pour {dog_name}',
    bodyFr: 'Le chocolat contient de la théobromine, une substance que les chiens ne métabolisent pas bien. Plus le chocolat est noir, plus il est concentré en théobromine. Pendant les fêtes, le chocolat est partout : sapin, table, cadeaux, calendriers de l\'Avent. Rangez tout le chocolat hors de portée de {dog_name}. Prévenez vos invités de ne rien donner à manger au chien. Si {dog_name} a consommé du chocolat — même une petite quantité de chocolat noir — contactez votre vétérinaire en indiquant le type de chocolat et la quantité approximative ingérée. Ne faites pas vomir votre chien sans avis vétérinaire.',
    activeFrom: '2026-12-01',
    activeTo: '2027-01-05',
    source: 'centre_antipoison_veterinaire',
  },

  // ── Chocolat Pâques ──────────────────────────────────────────────
  {
    alertType: 'chocolat',
    region: 'all',
    severity: 'attention' as const,
    titleFr: 'Pâques : le chocolat est un danger pour {dog_name}',
    bodyFr: 'Les chasses aux oeufs de Pâques sont un moment de enthousiasme en famille, mais le chocolat caché dans le jardin ou la maison représente un vrai point de vigilance pour {dog_name}. Un chien peut trouver et avaler des oeufs en chocolat avant les enfants. Surveillez {dog_name} pendant la chasse aux oeufs et vérifiez que tous les chocolats ont été retrouvés après. Rangez les chocolats reçus en cadeau hors de portée. Si {dog_name} a consommé du chocolat, notez la quantité et le type (noir, au lait, blanc — le noir est le plus concentré en théobromine) et contactez votre vétérinaire.',
    activeFrom: '2026-03-28',
    activeTo: '2026-04-10',
    source: 'emopet',
  },

  // ── Sel de déneigement (Dec-Feb) ─────────────────────────────────
  {
    alertType: 'sel_deneigement',
    region: 'bretagne',
    severity: 'info' as const,
    titleFr: 'Sel de déneigement et pattes de {dog_name}',
    bodyFr: 'Le sel épandu sur les trottoirs et routes en hiver peut irriter les coussinets de {dog_name}. Après chaque promenade par temps de gel, rincez ses pattes à l\'eau tiède et séchez-les bien, y compris entre les doigts. Le sel peut aussi provoquer des irritations s\'il est léché. Si {dog_name} boite ou lèche ses pattes de façon inhabituelle après une promenade hivernale, vérifiez ses coussinets. Vous pouvez appliquer un baume protecteur pour coussinets avant la promenade pour créer une barrière. Les bottines pour chien existent aussi, même si tous les chiens ne les acceptent pas facilement.',
    activeFrom: '2026-12-01',
    activeTo: '2027-02-28',
    source: 'emopet',
  },

  // ── Leptospirose (year-round, peak after floods) ─────────────────
  {
    alertType: 'lepto',
    region: 'bretagne',
    severity: 'info' as const,
    titleFr: 'Eau stagnante : prudence pour {dog_name}',
    bodyFr: 'Après de fortes pluies ou des inondations, les eaux stagnantes et les flaques peuvent contenir des bactéries transmises par l\'urine de rongeurs. Évitez de laisser {dog_name} boire dans les flaques, les mares ou les cours d\'eau à faible débit, surtout après des épisodes pluvieux intenses. Emportez toujours une gourde d\'eau fraîche pour votre chien en promenade. Cette précaution est valable toute l\'année mais particulièrement après les périodes de pluie intense que connaît la Bretagne.',
    activeFrom: '2026-01-01',
    activeTo: '2026-12-31',
    source: 'emopet',
  },

  // ── Marrons et glands (Sep-Nov) ──────────────────────────────────
  {
    alertType: 'marrons_glands',
    region: 'bretagne',
    severity: 'info' as const,
    titleFr: 'Marrons et glands : attention en promenade avec {dog_name}',
    bodyFr: 'En automne, les parcs et forêts de Bretagne sont jonchés de marrons et de glands. Si {dog_name} a tendance à mâchouiller ce qu\'il trouve au sol, soyez vigilant. Les marrons d\'Inde contiennent de l\'esculine, et les glands des tanins, qui peuvent provoquer des troubles digestifs en cas d\'ingestion. Un ou deux glands ne poseront probablement pas de souci à un grand chien, mais un petit chien qui en avale plusieurs peut présenter des vomissements ou de la diarrhée. Surveillez {dog_name} pendant les promenades en forêt et proposez-lui un jouet à mâcher pour détourner son attention.',
    activeFrom: '2026-09-15',
    activeTo: '2026-11-30',
    source: 'emopet',
  },

  // ── Champignons (Sep-Nov) ────────────────────────────────────────
  {
    alertType: 'champignons',
    region: 'bretagne',
    severity: 'attention' as const,
    titleFr: 'Champignons en forêt : surveiller {dog_name}',
    bodyFr: 'L\'automne breton est propice à la pousse de champignons, dont certains sont très toxiques pour les chiens comme pour les humains. {dog_name} peut être tenté de renifler ou de croquer un champignon en forêt. Certaines espèces provoquent des réactions très rapides. Si vous voyez {dog_name} mâcher un champignon, essayez de récupérer un échantillon (photo ou morceau dans un sac) et contactez votre vétérinaire. Ne prenez pas de point de vigilance : mieux vaut un appel pour rien qu\'une attente regrettable. Pendant les promenades en forêt, gardez un oeil sur ce que {dog_name} met dans sa gueule.',
    activeFrom: '2026-09-01',
    activeTo: '2026-11-30',
    source: 'emopet',
  },

  // ── Chasse (Sep-Feb) ─────────────────────────────────────────────
  {
    alertType: 'chasse',
    region: 'bretagne',
    severity: 'attention' as const,
    titleFr: 'Saison de chasse : sécurité en promenade pour {dog_name}',
    bodyFr: 'La saison de chasse est ouverte en Bretagne. Pour la sécurité de {dog_name} et la vôtre, équipez-le d\'un gilet fluorescent ou d\'un bandana voyant lors des promenades en forêt et campagne, surtout le mercredi, le samedi et le dimanche. Restez sur les sentiers balisés et évitez les zones signalées par des panneaux de chasse en cours. Si vous entendez des coups de feu, gardez {dog_name} en laisse et éloignez-vous calmement. Consultez le calendrier de chasse de votre commune pour connaître les jours et les zones concernés.',
    activeFrom: '2026-09-15',
    activeTo: '2027-02-28',
    source: 'prefet_morbihan',
  },

  // ── Antigel (Nov-Mar) ────────────────────────────────────────────
  {
    alertType: 'antigel',
    region: 'all',
    severity: 'urgent' as const,
    titleFr: 'Antigel : danger mortel pour {dog_name}',
    bodyFr: 'L\'antigel (éthylène glycol) a un goût sucré qui attire les chiens, mais c\'est un poison mortel même en très petite quantité. En hiver, des fuites d\'antigel peuvent se retrouver dans les garages, sur les parkings ou dans les allées. Ne laissez jamais {dog_name} lécher des flaques colorées (souvent vertes ou roses) au sol. Rangez vos bidons d\'antigel en hauteur et nettoyez immédiatement toute fuite. Si vous suspectez que {dog_name} a ingéré de l\'antigel — même quelques léchouilles — c\'est une urgence vitale : contactez immédiatement votre vétérinaire ou le vétérinaire de garde. Chaque minute compte.',
    activeFrom: '2026-11-01',
    activeTo: '2027-03-31',
    source: 'centre_antipoison_veterinaire',
  },
];
