/**
 * Seed content for the single Global Template.
 *
 * Structure follows the PRD: two areas, one with three Very Easy units and one
 * with two Hard units. Unit 1 ("The head") is lifted verbatim from the Claude
 * Design source — same six words, IPA, syllabification, Spanish definitions,
 * English examples, mirror paragraph and six activities — so the app renders
 * exactly like the mockup on first load.
 */
import type { ActivityType, Difficulty } from "../src/generated/prisma";

export type SeedWord = {
  text: string;
  translation: string;
  definition: string;
  definitionEs: string;
  ipa: string;
  syllables: string;
  stress: string;
  pos: string;
  exampleSentence: string;
  exampleSentenceEs: string;
};

export type SeedActivity = {
  type: ActivityType;
  word: string;
  prompt: string;
  promptEs: string;
  sentence?: string;
  options?: string[];
  answerIndex?: number;
  note: string;
  noteEs: string;
  mono?: boolean;
};

export type SeedUnit = {
  name: string;
  subtitle: string;
  subtitleEn: string;
  difficulty: Difficulty;
  introParagraph: string;
  introParagraphEs: string;
  words: SeedWord[];
  activities: SeedActivity[];
};

export type SeedArea = {
  name: string;
  nameEs: string;
  description: string;
  iconKey: string;
  tint: string;
  units: SeedUnit[];
};

// ── Area 1 · Human Body — three Very Easy units ─────────────────────────────

const THE_HEAD: SeedUnit = {
  name: "The head",
  subtitle: "6 palabras · la cabeza",
  subtitleEn: "6 words · the head",
  difficulty: "VERY_EASY",
  introParagraph:
    "Look at your face in the mirror. Your forehead is above your eyebrows, and one eyelash grows from every edge of the eye. When you smile, each cheek lifts a little. When you talk, your jaw moves and your chin goes down. Touch each part slowly and say its name out loud.",
  introParagraphEs:
    "Mírate la cara en el espejo. La frente está sobre las cejas y cada pestaña crece en el borde del ojo. Al sonreír, la mejilla sube un poco; al hablar, la mandíbula se mueve y el mentón baja. Toca cada parte despacio y di su nombre en voz alta.",
  words: [
    {
      text: "forehead",
      translation: "la frente",
      definition: "The part of the face between the eyebrows and the hairline.",
      definitionEs: "La frente: la parte de la cara entre las cejas y el pelo.",
      ipa: "/ˈfɔr.hɛd/",
      syllables: "FORE·head",
      stress: "fore",
      pos: "sustantivo",
      exampleSentence: "He wiped the sweat off his forehead.",
      exampleSentenceEs: "Se secó el sudor de la frente.",
    },
    {
      text: "eyebrow",
      translation: "la ceja",
      definition: "The line of hair above each eye.",
      definitionEs: "La ceja: la línea de pelo sobre cada ojo.",
      ipa: "/ˈaɪ.braʊ/",
      syllables: "EYE·brow",
      stress: "eye",
      pos: "sustantivo",
      exampleSentence: "She raised one eyebrow and said nothing.",
      exampleSentenceEs: "Levantó una ceja y no dijo nada.",
    },
    {
      text: "eyelash",
      translation: "la pestaña",
      definition: "Each hair on the edge of the eyelid.",
      definitionEs: "La pestaña: cada pelo en el borde del párpado.",
      ipa: "/ˈaɪ.læʃ/",
      syllables: "EYE·lash",
      stress: "eye",
      pos: "sustantivo",
      exampleSentence: "An eyelash fell into my eye.",
      exampleSentenceEs: "Se me metió una pestaña en el ojo.",
    },
    {
      text: "cheek",
      translation: "la mejilla",
      definition: "The soft side of the face, below the eye.",
      definitionEs: "La mejilla: el lado blando de la cara, bajo el ojo.",
      ipa: "/tʃik/",
      syllables: "cheek",
      stress: "cheek",
      pos: "sustantivo",
      exampleSentence: "The baby has soft, round cheeks.",
      exampleSentenceEs: "El bebé tiene las mejillas suaves y redondas.",
    },
    {
      text: "chin",
      translation: "el mentón",
      definition: "The lowest point of the face, below the mouth.",
      definitionEs: "El mentón o la barbilla: la parte baja de la cara.",
      ipa: "/tʃɪn/",
      syllables: "chin",
      stress: "chin",
      pos: "sustantivo",
      exampleSentence: "He rested his chin on his hand.",
      exampleSentenceEs: "Apoyó el mentón en la mano.",
    },
    {
      text: "jaw",
      translation: "la mandíbula",
      definition: "The bone you move when you speak or chew.",
      definitionEs: "La mandíbula: el hueso que mueves al hablar o masticar.",
      ipa: "/dʒɔ/",
      syllables: "jaw",
      stress: "jaw",
      pos: "sustantivo",
      exampleSentence: "My jaw hurts when I chew gum.",
      exampleSentenceEs: "Me duele la mandíbula cuando mastico chicle.",
    },
  ],
  activities: [
    {
      type: "FILL_BLANK",
      word: "eyebrow",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“She raised one ______ and said nothing.”",
      options: ["eyebrow", "eyelash", "forehead", "cheek"],
      answerIndex: 0,
      note: "eyebrow /ˈaɪ.braʊ/ — the hair line above the eye. “eyelash” is different.",
      noteEs: "eyebrow /ˈaɪ.braʊ/ — la ceja. «eyelash» es la pestaña.",
    },
    {
      type: "IPA_MATCH",
      word: "cheek",
      prompt: "Which transcription matches “cheek”?",
      promptEs: "¿Cuál es la transcripción de «cheek»?",
      options: ["/tʃik/", "/ʃik/", "/tʃɛk/", "/kik/"],
      answerIndex: 0,
      mono: true,
      note: "It starts with /tʃ/ and the vowel is long: /tʃik/.",
      noteEs: "Empieza con /tʃ/ (como «ch» en «chico») y la vocal es larga: /tʃik/.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "jaw",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "jaw /dʒɔ/ — only three letters: j-a-w.",
      noteEs: "jaw /dʒɔ/ — la mandíbula. Solo tres letras: j-a-w.",
    },
    {
      type: "FILL_BLANK",
      word: "chin",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“He rested his ______ on his hand while thinking.”",
      options: ["chin", "jaw", "cheek", "forehead"],
      answerIndex: 0,
      note: "chin /tʃɪn/ — the point of the face; the “jaw” is the bone.",
      noteEs: "chin /tʃɪn/ — el mentón. La mandíbula («jaw») es el hueso, no la punta.",
    },
    {
      type: "IPA_MATCH",
      word: "forehead",
      prompt: "Which word sounds /ˈfɔr.hɛd/?",
      promptEs: "¿Qué palabra suena /ˈfɔr.hɛd/?",
      options: ["forehead", "foreground", "forward", "farmhead"],
      answerIndex: 0,
      note: "The stress falls on the first syllable: FORE·head.",
      noteEs: "El acento cae en la primera sílaba: FORE·head.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "cheek",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "cheek /tʃik/ — spelled with “ch” though it sounds like one consonant.",
      noteEs: "cheek /tʃik/ — se escribe con «ch» aunque suene una sola consonante.",
    },
  ],
};

const THE_TRUNK: SeedUnit = {
  name: "The trunk",
  subtitle: "6 palabras · el torso",
  subtitleEn: "6 words · the torso",
  difficulty: "VERY_EASY",
  introParagraph:
    "Stand up straight and look down. Your shoulder is at the top, and your chest is in front of it. Below the chest is the waist, the thin part in the middle. Each hip is at the side, under the waist. Your back is behind you, and one elbow bends when you lift your arm. Say each word and touch that part of your body.",
  introParagraphEs:
    "Ponte de pie y mira hacia abajo. El hombro está arriba y el pecho queda delante. Debajo del pecho está la cintura, la parte delgada del medio. Cada cadera está al lado, bajo la cintura. La espalda queda detrás y el codo se dobla cuando levantas el brazo. Di cada palabra y toca esa parte de tu cuerpo.",
  words: [
    {
      text: "shoulder",
      translation: "el hombro",
      definition: "The joint where the arm meets the body.",
      definitionEs: "El hombro: la unión entre el brazo y el cuerpo.",
      ipa: "/ˈʃoʊl.dɚ/",
      syllables: "SHOUL·der",
      stress: "shoul",
      pos: "sustantivo",
      exampleSentence: "She carried the bag on one shoulder.",
      exampleSentenceEs: "Llevaba la bolsa en un hombro.",
    },
    {
      text: "chest",
      translation: "el pecho",
      definition: "The front of the body between the neck and the waist.",
      definitionEs: "El pecho: la parte delantera del cuerpo entre el cuello y la cintura.",
      ipa: "/tʃɛst/",
      syllables: "chest",
      stress: "chest",
      pos: "sustantivo",
      exampleSentence: "He crossed his arms over his chest.",
      exampleSentenceEs: "Cruzó los brazos sobre el pecho.",
    },
    {
      text: "waist",
      translation: "la cintura",
      definition: "The narrow part of the body above the hips.",
      definitionEs: "La cintura: la parte estrecha del cuerpo sobre las caderas.",
      ipa: "/weɪst/",
      syllables: "waist",
      stress: "waist",
      pos: "sustantivo",
      exampleSentence: "The belt was too tight around my waist.",
      exampleSentenceEs: "El cinturón me apretaba la cintura.",
    },
    {
      text: "hip",
      translation: "la cadera",
      definition: "The wide bone at each side of the body, below the waist.",
      definitionEs: "La cadera: el hueso ancho a cada lado del cuerpo, bajo la cintura.",
      ipa: "/hɪp/",
      syllables: "hip",
      stress: "hip",
      pos: "sustantivo",
      exampleSentence: "She rested her hand on her hip.",
      exampleSentenceEs: "Apoyó la mano en la cadera.",
    },
    {
      text: "back",
      translation: "la espalda",
      definition: "The rear side of the body, from the shoulders to the hips.",
      definitionEs: "La espalda: la parte de atrás del cuerpo, de los hombros a las caderas.",
      ipa: "/bæk/",
      syllables: "back",
      stress: "back",
      pos: "sustantivo",
      exampleSentence: "My back hurts after sitting all day.",
      exampleSentenceEs: "Me duele la espalda después de estar sentado todo el día.",
    },
    {
      text: "elbow",
      translation: "el codo",
      definition: "The joint in the middle of the arm.",
      definitionEs: "El codo: la articulación en medio del brazo.",
      ipa: "/ˈɛl.boʊ/",
      syllables: "EL·bow",
      stress: "el",
      pos: "sustantivo",
      exampleSentence: "He hit his elbow on the door.",
      exampleSentenceEs: "Se golpeó el codo con la puerta.",
    },
  ],
  activities: [
    {
      type: "FILL_BLANK",
      word: "shoulder",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“She carried the bag on one ______.”",
      options: ["shoulder", "elbow", "hip", "waist"],
      answerIndex: 0,
      note: "shoulder /ˈʃoʊl.dɚ/ — where the arm meets the body.",
      noteEs: "shoulder /ˈʃoʊl.dɚ/ — el hombro, donde el brazo se une al cuerpo.",
    },
    {
      type: "IPA_MATCH",
      word: "waist",
      prompt: "Which transcription matches “waist”?",
      promptEs: "¿Cuál es la transcripción de «waist»?",
      options: ["/weɪst/", "/wɪst/", "/waɪst/", "/vɛst/"],
      answerIndex: 0,
      mono: true,
      note: "“waist” sounds exactly like “waste”: /weɪst/.",
      noteEs: "«waist» suena igual que «waste»: /weɪst/.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "hip",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "hip /hɪp/ — three letters, short vowel.",
      noteEs: "hip /hɪp/ — la cadera. Tres letras, vocal corta.",
    },
    {
      type: "FILL_BLANK",
      word: "back",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“My ______ hurts after sitting all day.”",
      options: ["back", "chest", "elbow", "shoulder"],
      answerIndex: 0,
      note: "back /bæk/ — the rear of the body; the “chest” is the front.",
      noteEs: "back /bæk/ — la espalda. El «chest» es el pecho, la parte de delante.",
    },
    {
      type: "IPA_MATCH",
      word: "elbow",
      prompt: "Which word sounds /ˈɛl.boʊ/?",
      promptEs: "¿Qué palabra suena /ˈɛl.boʊ/?",
      options: ["elbow", "eyebrow", "elbaw", "album"],
      answerIndex: 0,
      note: "The second syllable rhymes with “go”: EL·bow.",
      noteEs: "La segunda sílaba rima con «go»: EL·bow.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "chest",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "chest /tʃɛst/ — starts with the same sound as “cheek”.",
      noteEs: "chest /tʃɛst/ — empieza con el mismo sonido que «cheek».",
    },
  ],
};

const ORGANS: SeedUnit = {
  name: "Organs",
  subtitle: "6 palabras · los órganos",
  subtitleEn: "6 words · organs",
  difficulty: "VERY_EASY",
  introParagraph:
    "Inside your body there are many organs. Your heart moves the blood, and each lung takes in air. The liver cleans the blood, and each kidney takes the water out. Your stomach holds the food you eat. Your brain thinks and tells the body what to do. Point to each one and say its name.",
  introParagraphEs:
    "Dentro del cuerpo hay muchos órganos. El corazón mueve la sangre y cada pulmón toma aire. El hígado limpia la sangre y cada riñón saca el agua. El estómago guarda la comida. El cerebro piensa y le dice al cuerpo qué hacer. Señala cada uno y di su nombre.",
  words: [
    {
      text: "heart",
      translation: "el corazón",
      definition: "The organ that pumps blood through the body.",
      definitionEs: "El corazón: el órgano que bombea la sangre por el cuerpo.",
      ipa: "/hɑrt/",
      syllables: "heart",
      stress: "heart",
      pos: "sustantivo",
      exampleSentence: "After running, my heart was beating fast.",
      exampleSentenceEs: "Después de correr, el corazón me latía rápido.",
    },
    {
      text: "lung",
      translation: "el pulmón",
      definition: "One of the two organs you use to breathe.",
      definitionEs: "El pulmón: uno de los dos órganos con los que respiras.",
      ipa: "/lʌŋ/",
      syllables: "lung",
      stress: "lung",
      pos: "sustantivo",
      exampleSentence: "Smoke is bad for every lung.",
      exampleSentenceEs: "El humo es malo para los pulmones.",
    },
    {
      text: "liver",
      translation: "el hígado",
      definition: "The large organ that cleans the blood.",
      definitionEs: "El hígado: el órgano grande que limpia la sangre.",
      ipa: "/ˈlɪv.ɚ/",
      syllables: "LIV·er",
      stress: "liv",
      pos: "sustantivo",
      exampleSentence: "The doctor checked his liver.",
      exampleSentenceEs: "El médico le revisó el hígado.",
    },
    {
      text: "kidney",
      translation: "el riñón",
      definition: "One of two organs that clean water out of the blood.",
      definitionEs: "El riñón: uno de los dos órganos que sacan el agua de la sangre.",
      ipa: "/ˈkɪd.ni/",
      syllables: "KID·ney",
      stress: "kid",
      pos: "sustantivo",
      exampleSentence: "He gave a kidney to his brother.",
      exampleSentenceEs: "Le dio un riñón a su hermano.",
    },
    {
      text: "stomach",
      translation: "el estómago",
      definition: "The organ that holds food after you eat it.",
      definitionEs: "El estómago: el órgano que guarda la comida después de comer.",
      ipa: "/ˈstʌm.ək/",
      syllables: "STOM·ach",
      stress: "stom",
      pos: "sustantivo",
      exampleSentence: "My stomach hurts, I ate too fast.",
      exampleSentenceEs: "Me duele el estómago, comí muy rápido.",
    },
    {
      text: "brain",
      translation: "el cerebro",
      definition: "The organ in the head that thinks and controls the body.",
      definitionEs: "El cerebro: el órgano de la cabeza que piensa y controla el cuerpo.",
      ipa: "/breɪn/",
      syllables: "brain",
      stress: "brain",
      pos: "sustantivo",
      exampleSentence: "Sleep is good for the brain.",
      exampleSentenceEs: "Dormir es bueno para el cerebro.",
    },
  ],
  activities: [
    {
      type: "FILL_BLANK",
      word: "heart",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“After running, my ______ was beating fast.”",
      options: ["heart", "lung", "liver", "brain"],
      answerIndex: 0,
      note: "heart /hɑrt/ — the organ that beats and moves the blood.",
      noteEs: "heart /hɑrt/ — el corazón, el órgano que late y mueve la sangre.",
    },
    {
      type: "IPA_MATCH",
      word: "lung",
      prompt: "Which transcription matches “lung”?",
      promptEs: "¿Cuál es la transcripción de «lung»?",
      options: ["/lʌŋ/", "/lɔŋ/", "/luŋ/", "/lʌng/"],
      answerIndex: 0,
      mono: true,
      note: "It ends in the /ŋ/ sound, with no hard g after it.",
      noteEs: "Termina en el sonido /ŋ/, sin una g fuerte después.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "brain",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "brain /breɪn/ — it rhymes with “train”.",
      noteEs: "brain /breɪn/ — el cerebro. Rima con «train».",
    },
    {
      type: "FILL_BLANK",
      word: "stomach",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“My ______ hurts, I ate too fast.”",
      options: ["stomach", "kidney", "liver", "lung"],
      answerIndex: 0,
      note: "stomach /ˈstʌm.ək/ — the “ch” at the end sounds like /k/.",
      noteEs: "stomach /ˈstʌm.ək/ — el estómago. La «ch» final suena /k/.",
    },
    {
      type: "IPA_MATCH",
      word: "kidney",
      prompt: "Which word sounds /ˈkɪd.ni/?",
      promptEs: "¿Qué palabra suena /ˈkɪd.ni/?",
      options: ["kidney", "kidnap", "candy", "kindly"],
      answerIndex: 0,
      note: "Two syllables, stress on the first: KID·ney.",
      noteEs: "Dos sílabas, acento en la primera: KID·ney.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "liver",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "liver /ˈlɪv.ɚ/ — like “live” plus -er, with a short i.",
      noteEs: "liver /ˈlɪv.ɚ/ — el hígado. Como «live» más -er, con i corta.",
    },
  ],
};

// ── Area 2 · Food & Cooking — two Hard units ────────────────────────────────

const COOKING_VERBS: SeedUnit = {
  name: "Cooking verbs",
  subtitle: "6 palabras · verbos de cocina",
  subtitleEn: "6 words · cooking verbs",
  difficulty: "HARD",
  introParagraph:
    "A good cook knows that heat is a language. You sear a steak hard and fast so the outside browns while the centre stays rare, then you let it rest. A stew, by contrast, wants patience: you simmer it barely below a boil for hours, until the meat surrenders. Sauces ask for a lighter hand — whisk the yolks until they thicken, then fold in the cream rather than stirring, so the air you worked in survives. If the recipe tells you to marinate the meat overnight, do it; acid and salt reach places heat never will. And when onions caramelize, they stop being sharp and turn sweet, dark and almost jammy. Learn these six verbs and half of any recipe becomes obvious.",
  introParagraphEs:
    "Un buen cocinero sabe que el calor es un idioma. Sellas un filete fuerte y rápido para que se dore por fuera y quede rojo en el centro, y luego lo dejas reposar. Un guiso, en cambio, pide paciencia: lo cocinas a fuego lento, justo por debajo del hervor, durante horas, hasta que la carne se rinde. Las salsas piden una mano más suave: bate las yemas hasta que espesen y luego incorpora la crema con movimientos envolventes, en vez de revolver, para que el aire no se pierda. Si la receta dice marinar la carne toda la noche, hazlo; el ácido y la sal llegan donde el calor nunca llega. Y cuando la cebolla se carameliza, deja de ser picante y se vuelve dulce, oscura y casi como una mermelada. Aprende estos seis verbos y media receta se vuelve obvia.",
  words: [
    {
      text: "sear",
      translation: "sellar",
      definition:
        "To cook the surface of meat at very high heat so it browns quickly.",
      definitionEs:
        "Sellar: cocinar la superficie de la carne a fuego muy alto para que se dore rápido.",
      ipa: "/sɪr/",
      syllables: "sear",
      stress: "sear",
      pos: "verbo",
      exampleSentence: "Sear the steak for two minutes on each side.",
      exampleSentenceEs: "Sella el filete dos minutos por cada lado.",
    },
    {
      text: "simmer",
      translation: "cocer a fuego lento",
      definition: "To cook liquid gently, just below boiling point.",
      definitionEs:
        "Cocer a fuego lento: cocinar un líquido suavemente, justo por debajo del hervor.",
      ipa: "/ˈsɪm.ɚ/",
      syllables: "SIM·mer",
      stress: "sim",
      pos: "verbo",
      exampleSentence: "Let the sauce simmer for forty minutes.",
      exampleSentenceEs: "Deja que la salsa se cocine a fuego lento cuarenta minutos.",
    },
    {
      text: "whisk",
      translation: "batir",
      definition: "To beat a liquid quickly to mix it and add air.",
      definitionEs: "Batir: mezclar un líquido rápidamente para incorporarle aire.",
      ipa: "/wɪsk/",
      syllables: "whisk",
      stress: "whisk",
      pos: "verbo",
      exampleSentence: "Whisk the egg yolks until they thicken.",
      exampleSentenceEs: "Bate las yemas hasta que espesen.",
    },
    {
      text: "fold",
      translation: "incorporar con movimientos envolventes",
      definition:
        "To combine a light mixture into a heavier one gently, without losing air.",
      definitionEs:
        "Incorporar con movimientos envolventes: unir una mezcla ligera con otra más densa sin perder el aire.",
      ipa: "/foʊld/",
      syllables: "fold",
      stress: "fold",
      pos: "verbo",
      exampleSentence: "Fold the cream into the chocolate, do not stir it.",
      exampleSentenceEs: "Incorpora la crema al chocolate con movimientos envolventes, no la revuelvas.",
    },
    {
      text: "marinate",
      translation: "marinar",
      definition:
        "To soak food in a seasoned liquid before cooking so it takes on flavour.",
      definitionEs:
        "Marinar: dejar la comida en un líquido con sazón antes de cocinarla para que tome sabor.",
      ipa: "/ˈmɛr.ə.neɪt/",
      syllables: "MAR·i·nate",
      stress: "mar",
      pos: "verbo",
      exampleSentence: "Marinate the chicken overnight in lime and garlic.",
      exampleSentenceEs: "Marina el pollo toda la noche en limón y ajo.",
    },
    {
      text: "caramelize",
      translation: "caramelizar",
      definition:
        "To cook sugar, or the sugars in a food, until it browns and turns sweet.",
      definitionEs:
        "Caramelizar: cocinar el azúcar, o los azúcares de un alimento, hasta que se dora y endulza.",
      ipa: "/ˈkɛr.ə.mə.laɪz/",
      syllables: "CAR·a·mel·ize",
      stress: "car",
      pos: "verbo",
      exampleSentence: "Cook the onions slowly until they caramelize.",
      exampleSentenceEs: "Cocina las cebollas despacio hasta que se caramelicen.",
    },
  ],
  activities: [
    {
      type: "FILL_BLANK",
      word: "simmer",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“Bring it to a boil, then lower the heat and let it ______ for an hour.”",
      options: ["simmer", "sear", "whisk", "caramelize"],
      answerIndex: 0,
      note: "simmer /ˈsɪm.ɚ/ — gentle heat below boiling. Searing is the opposite: very high heat.",
      noteEs: "simmer /ˈsɪm.ɚ/ — fuego lento, por debajo del hervor. «Sear» es lo contrario: fuego muy alto.",
    },
    {
      type: "IPA_MATCH",
      word: "marinate",
      prompt: "Which transcription matches “marinate”?",
      promptEs: "¿Cuál es la transcripción de «marinate»?",
      options: ["/ˈmɛr.ə.neɪt/", "/mɑˈriː.neɪt/", "/ˈmær.ɪ.nət/", "/ˈmɛr.ə.nɪt/"],
      answerIndex: 0,
      mono: true,
      note: "Three syllables, stress on the first, and the last one rhymes with “late”.",
      noteEs: "Tres sílabas, acento en la primera, y la última rima con «late».",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "whisk",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "whisk /wɪsk/ — the h is silent, and it ends in a hard -sk.",
      noteEs: "whisk /wɪsk/ — batir. La h no se pronuncia y termina en -sk.",
    },
    {
      type: "FILL_BLANK",
      word: "fold",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“______ the whipped cream in gently so the mousse stays light.”",
      options: ["Fold", "Whisk", "Sear", "Marinate"],
      answerIndex: 0,
      note: "You fold to keep air in; whisking at that point would knock it out.",
      noteEs: "Se incorpora con movimientos envolventes para conservar el aire; batir en ese punto lo sacaría.",
    },
    {
      type: "IPA_MATCH",
      word: "sear",
      prompt: "Which word sounds /sɪr/?",
      promptEs: "¿Qué palabra suena /sɪr/?",
      options: ["sear", "sir", "sour", "share"],
      answerIndex: 0,
      note: "“sear” sounds like “seer”, not like “sir”.",
      noteEs: "«sear» suena como «seer», no como «sir».",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "caramelize",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "caramelize — American spelling with -ize; four syllables.",
      noteEs: "caramelize — grafía americana con -ize; cuatro sílabas.",
    },
  ],
};

const EATING_OUT: SeedUnit = {
  name: "Eating out",
  subtitle: "6 palabras · restaurante",
  subtitleEn: "6 words · restaurant",
  difficulty: "HARD",
  introParagraph:
    "Dining out has a vocabulary of its own, and most of it appears before the food does. You make a reservation, and if the place is busy the host may still keep you waiting at the bar. The appetizer arrives first — small, sharp, designed to wake up the palate rather than fill you. A careful kitchen will ask about any allergen before it plates anything, and a good server volunteers that information without being asked. What lands in front of you is usually finished with a garnish, which is not decoration for its own sake but a last note of acid or herb. At the end, the gratuity may already be included, and in some countries adding more is unusual rather than generous.",
  introParagraphEs:
    "Comer fuera tiene su propio vocabulario, y casi todo aparece antes que la comida. Haces una reserva y, si el lugar está lleno, el anfitrión puede hacerte esperar en la barra. La entrada llega primero: pequeña, intensa, pensada para despertar el paladar más que para llenarte. Una cocina cuidadosa preguntará por cualquier alérgeno antes de emplatar, y un buen mesero da esa información sin que se la pidan. Lo que llega a la mesa suele terminar con una guarnición, que no es adorno por adorno, sino una última nota de ácido o hierba. Al final, la propina puede venir incluida, y en algunos países añadir más resulta raro más que generoso.",
  words: [
    {
      text: "reservation",
      translation: "la reserva",
      definition: "An arrangement to keep a table for you at a set time.",
      definitionEs: "La reserva: el acuerdo para guardarte una mesa a una hora fija.",
      ipa: "/ˌrɛz.ɚˈveɪ.ʃən/",
      syllables: "res·er·VA·tion",
      stress: "va",
      pos: "sustantivo",
      exampleSentence: "We have a reservation for eight under Rueda.",
      exampleSentenceEs: "Tenemos una reserva para las ocho a nombre de Rueda.",
    },
    {
      text: "appetizer",
      translation: "la entrada",
      definition: "A small dish served before the main course.",
      definitionEs: "La entrada: un plato pequeño que se sirve antes del principal.",
      ipa: "/ˈæp.ə.taɪ.zɚ/",
      syllables: "AP·pe·tiz·er",
      stress: "ap",
      pos: "sustantivo",
      exampleSentence: "We shared an appetizer while we read the menu.",
      exampleSentenceEs: "Compartimos una entrada mientras leíamos el menú.",
    },
    {
      text: "palate",
      translation: "el paladar",
      definition: "A person's sense of taste, or their ability to judge flavour.",
      definitionEs:
        "El paladar: el sentido del gusto de una persona, o su capacidad de juzgar sabores.",
      ipa: "/ˈpæl.ət/",
      syllables: "PAL·ate",
      stress: "pal",
      pos: "sustantivo",
      exampleSentence: "The lemon cleans the palate between courses.",
      exampleSentenceEs: "El limón limpia el paladar entre platos.",
    },
    {
      text: "garnish",
      translation: "la guarnición",
      definition: "A small addition of food that finishes a dish.",
      definitionEs: "La guarnición: un añadido pequeño que termina un plato.",
      ipa: "/ˈɡɑr.nɪʃ/",
      syllables: "GAR·nish",
      stress: "gar",
      pos: "sustantivo",
      exampleSentence: "The soup came with a garnish of fresh herbs.",
      exampleSentenceEs: "La sopa venía con una guarnición de hierbas frescas.",
    },
    {
      text: "allergen",
      translation: "el alérgeno",
      definition: "A substance in food that can cause an allergic reaction.",
      definitionEs:
        "El alérgeno: una sustancia en la comida que puede causar una reacción alérgica.",
      ipa: "/ˈæl.ɚ.dʒən/",
      syllables: "AL·ler·gen",
      stress: "al",
      pos: "sustantivo",
      exampleSentence: "Tell the server about any allergen before you order.",
      exampleSentenceEs: "Dile al mesero de cualquier alérgeno antes de pedir.",
    },
    {
      text: "gratuity",
      translation: "la propina",
      definition: "Money added for service, especially when it is stated on the bill.",
      definitionEs:
        "La propina: el dinero que se añade por el servicio, sobre todo cuando ya viene en la cuenta.",
      ipa: "/ɡrəˈtu.ə.ti/",
      syllables: "gra·TU·i·ty",
      stress: "tu",
      pos: "sustantivo",
      exampleSentence: "A gratuity of ten percent is already included.",
      exampleSentenceEs: "Ya viene incluida una propina del diez por ciento.",
    },
  ],
  activities: [
    {
      type: "FILL_BLANK",
      word: "reservation",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“We have a ______ for eight under Rueda.”",
      options: ["reservation", "gratuity", "garnish", "palate"],
      answerIndex: 0,
      note: "reservation — the table you booked. A “gratuity” is the tip.",
      noteEs: "reservation — la reserva de mesa. La «gratuity» es la propina.",
    },
    {
      type: "IPA_MATCH",
      word: "palate",
      prompt: "Which transcription matches “palate”?",
      promptEs: "¿Cuál es la transcripción de «palate»?",
      options: ["/ˈpæl.ət/", "/pəˈleɪt/", "/ˈpæl.eɪt/", "/ˈpɑ.lət/"],
      answerIndex: 0,
      mono: true,
      note: "It sounds like “pallet”, not like “plate”: stress on the first syllable.",
      noteEs: "Suena como «pallet», no como «plate»: el acento va en la primera sílaba.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "garnish",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "garnish /ˈɡɑr.nɪʃ/ — it ends in -ish, not -ich.",
      noteEs: "garnish /ˈɡɑr.nɪʃ/ — la guarnición. Termina en -ish, no en -ich.",
    },
    {
      type: "FILL_BLANK",
      word: "allergen",
      prompt: "Choose the word that completes the sentence.",
      promptEs: "Elige la palabra que completa la frase.",
      sentence: "“Tell the server about any ______ before you order.”",
      options: ["allergen", "appetizer", "garnish", "palate"],
      answerIndex: 0,
      note: "allergen — the substance itself. “Allergy” is the reaction to it.",
      noteEs: "allergen — la sustancia. La «allergy» es la reacción a ella.",
    },
    {
      type: "IPA_MATCH",
      word: "gratuity",
      prompt: "Which word sounds /ɡrəˈtu.ə.ti/?",
      promptEs: "¿Qué palabra suena /ɡrəˈtu.ə.ti/?",
      options: ["gratuity", "gratitude", "graduate", "gravity"],
      answerIndex: 0,
      note: "Four syllables, stress on the second: gra-TU-i-ty.",
      noteEs: "Cuatro sílabas, acento en la segunda: gra-TU-i-ty.",
    },
    {
      type: "TYPE_WHAT_YOU_HEAR",
      word: "appetizer",
      prompt: "Listen and spell the word.",
      promptEs: "Escucha y escribe la palabra.",
      note: "appetizer — double p, and -izer with a z in American spelling.",
      noteEs: "appetizer — doble p y -izer con z en la grafía americana.",
    },
  ],
};

export const TEMPLATE_NAME = "Plantilla inicial";

export const SEED_AREAS: SeedArea[] = [
  {
    name: "Human Body",
    nameEs: "El cuerpo humano",
    description:
      "Las partes del cuerpo que nombras todos los días: la cara, el torso y los órganos por dentro.",
    iconKey: "body",
    tint: "#FFEDD5",
    units: [THE_HEAD, THE_TRUNK, ORGANS],
  },
  {
    name: "Food & Cooking",
    nameEs: "Comida y cocina",
    description:
      "El vocabulario de la cocina y del restaurante, en un nivel exigente: verbos de técnica y palabras de servicio.",
    iconKey: "food",
    tint: "#FDECEF",
    units: [COOKING_VERBS, EATING_OUT],
  },
];

/** The six badges from the design, with their SVG paths. */
export const SEED_BADGES = [
  {
    key: "bd1",
    order: 1,
    svgPath:
      "M9 3h6l-1.6 5h-2.8L9 3M12 9.2a5 5 0 100 10 5 5 0 000-10M12 11.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9",
  },
  {
    key: "bd2",
    order: 2,
    svgPath:
      "M12 3s4 3.4 4 7.2c0 2.8-1.8 6.3-4 6.3s-4-3.5-4-6.3c0-1.7 1.1-2.8 1.1-2.8 0 2.2 1.1 2.8 1.7 2.8.9 0 1.2-1.7 1.2-7.2M12 17v3.5",
  },
  {
    key: "bd3",
    order: 3,
    svgPath: "M12 4.5a2.2 2.2 0 100 4.4 2.2 2.2 0 000-4.4M8 10.8h8M12 10.8V17M9.5 20.2l2.5-3 2.5 3",
  },
  {
    key: "bd4",
    order: 4,
    svgPath: "M8.5 9.2a3.5 3.5 0 117 0c0 2.4-2.4 3-2.4 5.3A2.6 2.6 0 018 14.7M6 6.6A7 7 0 0118 6.6",
  },
  {
    key: "bd5",
    order: 5,
    svgPath:
      "M8 4h8v3.5a4 4 0 01-8 0V4M8 5.6H5.5A3.5 3.5 0 009 9.5M16 5.6h2.5A3.5 3.5 0 0115 9.5M12 12.2v4.4M9 19.6h6",
  },
  {
    key: "bd6",
    order: 6,
    svgPath: "M12 4a8 8 0 100 16 8 8 0 000-16M12 8a4 4 0 100 8 4 4 0 000-8M12 11.2a.8.8 0 100 1.6.8.8 0 000-1.6",
  },
];
