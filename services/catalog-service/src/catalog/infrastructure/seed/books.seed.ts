/**
 * Catálogo de demostración. Las sinopsis son descripciones breves escritas para el proyecto.
 * Los identificadores son deterministas para que préstamos y RFID puedan referenciarlos:
 *   libro i      → b0000000-0000-4000-8000-00000000000i
 *   ejemplar i,j → c0000000-0000-4000-8000-0000000(i*100+j)  · código BIB-(i*100+j)
 *   etiqueta     → E0040150 + hex(i*100+j)  (UID tipo ISO 15693, estándar en bibliotecas)
 */
export interface SeedBook {
  title: string;
  authors: string[];
  year: number;
  publisher: string;
  category: string;
  language?: string;
  pages: number;
  tags: string[];
  synopsis: string;
  copies: number;
}

export const ZONES: Record<string, { zone: string; shelf: string }> = {
  Física: { zone: 'Ciencias', shelf: 'A1' },
  Astronomía: { zone: 'Ciencias', shelf: 'A1' },
  Biología: { zone: 'Ciencias', shelf: 'A2' },
  Química: { zone: 'Ciencias', shelf: 'A3' },
  Matemáticas: { zone: 'Ciencias', shelf: 'A4' },
  Literatura: { zone: 'Literatura', shelf: 'B1' },
  Ensayo: { zone: 'Literatura', shelf: 'B2' },
  Programación: { zone: 'Tecnología', shelf: 'C1' },
  'Inteligencia Artificial': { zone: 'Tecnología', shelf: 'C2' },
  Historia: { zone: 'Humanidades', shelf: 'D1' },
  Filosofía: { zone: 'Humanidades', shelf: 'D2' },
  Psicología: { zone: 'Humanidades', shelf: 'D2' },
  Economía: { zone: 'Humanidades', shelf: 'D3' },
};

export const seedBookId = (i: number) => `b0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
export const seedCopyId = (i: number, j: number) => `c0000000-0000-4000-8000-${String(i * 100 + j).padStart(12, '0')}`;
export const seedCopyCode = (i: number, j: number) => `BIB-${String(i * 100 + j).padStart(5, '0')}`;
export const seedCopyEpc = (i: number, j: number) => `E0040150${(i * 100 + j).toString(16).toUpperCase().padStart(8, '0')}`;

/** Ejemplares que arrancan prestados (coinciden con los préstamos semilla de loans-service). */
export const SEED_ON_LOAN = [seedCopyId(3, 1), seedCopyId(13, 1)];

export const SEED_BOOKS: SeedBook[] = [
  {
    title: 'Breve historia del tiempo',
    authors: ['Stephen Hawking'],
    year: 1988,
    publisher: 'Crítica',
    category: 'Física',
    pages: 256,
    tags: ['cosmología', 'agujeros negros', 'big bang', 'divulgación'],
    synopsis:
      'Recorrido divulgativo por las grandes preguntas del cosmos: el origen del universo, la naturaleza del tiempo, los agujeros negros y la búsqueda de una teoría que unifique la relatividad con la física cuántica. Explica ideas complejas casi sin fórmulas.',
    copies: 3,
  },
  {
    title: 'El universo elegante',
    authors: ['Brian Greene'],
    year: 1999,
    publisher: 'Crítica',
    category: 'Física',
    pages: 464,
    tags: ['teoría de cuerdas', 'relatividad', 'mecánica cuántica', 'dimensiones'],
    synopsis:
      'Presenta la teoría de cuerdas como candidata a reconciliar la relatividad general con la mecánica cuántica. Usa analogías cotidianas para explicar dimensiones extra, supersimetría y el conflicto entre lo muy grande y lo muy pequeño.',
    copies: 2,
  },
  {
    title: 'Siete breves lecciones de física',
    authors: ['Carlo Rovelli'],
    year: 2014,
    publisher: 'Anagrama',
    category: 'Física',
    pages: 96,
    tags: ['física cuántica', 'relatividad', 'principiantes', 'divulgación', 'introducción'],
    synopsis:
      'Siete capítulos muy cortos que introducen, sin matemáticas, la relatividad general, la mecánica cuántica, la arquitectura del cosmos, las partículas elementales, la gravedad cuántica y la termodinámica de los agujeros negros. Ideal como primera lectura de física moderna.',
    copies: 3,
  },
  {
    title: 'Física cuántica para dummies',
    authors: ['Steven Holzner'],
    year: 2009,
    publisher: 'Para Dummies',
    category: 'Física',
    pages: 384,
    tags: ['física cuántica', 'principiantes', 'ejercicios', 'guía práctica'],
    synopsis:
      'Guía paso a paso para quien empieza en la física cuántica: cuantización de la energía, dualidad onda-partícula, principio de incertidumbre, ecuación de Schrödinger y espín, con ejemplos resueltos y un enfoque práctico para estudiantes.',
    copies: 2,
  },
  {
    title: 'Introducción a la mecánica cuántica',
    authors: ['David J. Griffiths'],
    year: 1995,
    publisher: 'Pearson',
    category: 'Física',
    pages: 480,
    tags: ['mecánica cuántica', 'ecuación de schrödinger', 'universitario', 'libro de texto'],
    synopsis:
      'Libro de texto universitario que desarrolla formalmente la mecánica cuántica: función de onda, operadores, átomo de hidrógeno, momento angular, teoría de perturbaciones y partículas idénticas. Requiere cálculo y álgebra lineal.',
    copies: 2,
  },
  {
    title: 'La realidad no es lo que parece',
    authors: ['Carlo Rovelli'],
    year: 2014,
    publisher: 'Tusquets',
    category: 'Física',
    pages: 264,
    tags: ['gravedad cuántica', 'espacio-tiempo', 'historia de la ciencia'],
    synopsis:
      'Narra la evolución de nuestra imagen del mundo desde Demócrito hasta la gravedad cuántica de bucles, explicando por qué el espacio y el tiempo podrían estar formados por granos discretos.',
    copies: 1,
  },
  {
    title: 'Cosmos',
    authors: ['Carl Sagan'],
    year: 1980,
    publisher: 'Planeta',
    category: 'Astronomía',
    pages: 384,
    tags: ['universo', 'astronomía', 'historia de la ciencia', 'divulgación'],
    synopsis:
      'Viaje por la historia de la ciencia y el lugar de la humanidad en el universo: desde las estrellas y los planetas hasta el origen de la vida y el futuro de la civilización, contado con un estilo apasionado y accesible.',
    copies: 2,
  },
  {
    title: 'El gen egoísta',
    authors: ['Richard Dawkins'],
    year: 1976,
    publisher: 'Salvat',
    category: 'Biología',
    pages: 407,
    tags: ['evolución', 'genética', 'comportamiento animal'],
    synopsis:
      'Propone mirar la evolución desde el punto de vista del gen: los organismos serían vehículos que los genes construyen para replicarse. Introduce además el concepto de meme como unidad de transmisión cultural.',
    copies: 2,
  },
  {
    title: 'El origen de las especies',
    authors: ['Charles Darwin'],
    year: 1859,
    publisher: 'Alianza',
    category: 'Biología',
    pages: 624,
    tags: ['evolución', 'selección natural', 'clásico'],
    synopsis:
      'Obra fundacional de la biología moderna en la que Darwin expone, con abundantes observaciones, la teoría de la evolución por selección natural y la descendencia común de las especies.',
    copies: 2,
  },
  {
    title: 'Química',
    authors: ['Raymond Chang'],
    year: 2010,
    publisher: 'McGraw-Hill',
    category: 'Química',
    pages: 1170,
    tags: ['química general', 'universitario', 'estequiometría', 'libro de texto'],
    synopsis:
      'Texto clásico de química general para primeros semestres: estructura atómica, enlace químico, estequiometría, termoquímica, equilibrio, ácidos y bases, con problemas resueltos y ejercicios.',
    copies: 3,
  },
  {
    title: 'Cálculo de una variable',
    authors: ['James Stewart'],
    year: 2012,
    publisher: 'Cengage',
    category: 'Matemáticas',
    pages: 900,
    tags: ['cálculo', 'derivadas', 'integrales', 'universitario'],
    synopsis:
      'Curso completo de cálculo diferencial e integral: límites, derivadas, aplicaciones, integrales y series, con explicaciones visuales y una gran cantidad de ejercicios graduados.',
    copies: 3,
  },
  {
    title: 'El hombre que calculaba',
    authors: ['Malba Tahan'],
    year: 1938,
    publisher: 'Veron',
    category: 'Matemáticas',
    pages: 224,
    tags: ['matemática recreativa', 'acertijos', 'novela', 'principiantes'],
    synopsis:
      'Novela en la que Beremiz Samir resuelve problemas y acertijos con ingenio matemático durante sus viajes por Bagdad. Una forma amena de acercarse a la aritmética y la lógica.',
    copies: 2,
  },
  {
    title: 'Cien años de soledad',
    authors: ['Gabriel García Márquez'],
    year: 1967,
    publisher: 'Sudamericana',
    category: 'Literatura',
    pages: 471,
    tags: ['realismo mágico', 'literatura latinoamericana', 'novela', 'clásico'],
    synopsis:
      'Saga de la familia Buendía a lo largo de siete generaciones en el pueblo de Macondo, donde lo cotidiano y lo fantástico conviven. Obra cumbre del realismo mágico.',
    copies: 3,
  },
  {
    title: 'Pedro Páramo',
    authors: ['Juan Rulfo'],
    year: 1955,
    publisher: 'Fondo de Cultura Económica',
    category: 'Literatura',
    pages: 128,
    tags: ['literatura mexicana', 'novela', 'clásico'],
    synopsis:
      'Juan Preciado llega a Comala en busca de su padre y descubre un pueblo habitado por voces y murmullos de muertos. Novela breve y fragmentada, fundamental en la literatura mexicana.',
    copies: 2,
  },
  {
    title: 'El laberinto de la soledad',
    authors: ['Octavio Paz'],
    year: 1950,
    publisher: 'Fondo de Cultura Económica',
    category: 'Ensayo',
    pages: 351,
    tags: ['identidad mexicana', 'ensayo', 'cultura'],
    synopsis:
      'Ensayo que reflexiona sobre la identidad, la historia y las costumbres de México: la fiesta, la muerte, el mestizaje y la relación con el pasado.',
    copies: 2,
  },
  {
    title: 'Don Quijote de la Mancha',
    authors: ['Miguel de Cervantes'],
    year: 1605,
    publisher: 'Real Academia Española',
    category: 'Literatura',
    pages: 1376,
    tags: ['clásico', 'novela', 'literatura española'],
    synopsis:
      'Un hidalgo que ha leído demasiados libros de caballerías decide hacerse caballero andante y recorre La Mancha junto a Sancho Panza. Considerada la primera novela moderna.',
    copies: 2,
  },
  {
    title: '1984',
    authors: ['George Orwell'],
    year: 1949,
    publisher: 'Debolsillo',
    category: 'Literatura',
    pages: 352,
    tags: ['distopía', 'vigilancia', 'política', 'novela'],
    synopsis:
      'En un estado totalitario donde el Gran Hermano todo lo vigila, Winston Smith trabaja reescribiendo la historia hasta que comienza a dudar del régimen. Clásico sobre la manipulación y el control.',
    copies: 2,
  },
  {
    title: 'Rayuela',
    authors: ['Julio Cortázar'],
    year: 1963,
    publisher: 'Sudamericana',
    category: 'Literatura',
    pages: 736,
    tags: ['literatura latinoamericana', 'novela experimental'],
    synopsis:
      'Novela que puede leerse en distintos órdenes y que sigue a Horacio Oliveira entre París y Buenos Aires. Un juego literario sobre el amor, el arte y la búsqueda de sentido.',
    copies: 1,
  },
  {
    title: 'Código limpio',
    authors: ['Robert C. Martin'],
    year: 2008,
    publisher: 'Anaya Multimedia',
    category: 'Programación',
    pages: 464,
    tags: ['buenas prácticas', 'refactorización', 'ingeniería de software'],
    synopsis:
      'Manual de buenas prácticas para escribir código legible y mantenible: nombres significativos, funciones pequeñas, manejo de errores, pruebas unitarias y refactorización a partir de casos reales.',
    copies: 2,
  },
  {
    title: 'Arquitectura limpia',
    authors: ['Robert C. Martin'],
    year: 2017,
    publisher: 'Anaya Multimedia',
    category: 'Programación',
    pages: 432,
    tags: ['arquitectura de software', 'arquitectura hexagonal', 'solid', 'ingeniería de software'],
    synopsis:
      'Explica cómo organizar sistemas para que las reglas de negocio no dependan de frameworks, bases de datos ni interfaces. Cubre los principios SOLID, límites entre capas y la regla de dependencias.',
    copies: 2,
  },
  {
    title: 'Introducción a los algoritmos',
    authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
    year: 2009,
    publisher: 'MIT Press',
    category: 'Programación',
    pages: 1312,
    tags: ['algoritmos', 'estructuras de datos', 'complejidad', 'universitario'],
    synopsis:
      'Referencia académica sobre diseño y análisis de algoritmos: ordenamiento, grafos, programación dinámica, algoritmos voraces y complejidad computacional, con pseudocódigo y demostraciones.',
    copies: 2,
  },
  {
    title: 'Curso intensivo de Python',
    authors: ['Eric Matthes'],
    year: 2019,
    publisher: 'Anaya Multimedia',
    category: 'Programación',
    pages: 560,
    tags: ['python', 'principiantes', 'proyectos'],
    synopsis:
      'Introducción práctica a la programación con Python: variables, listas, funciones, clases y archivos, seguida de proyectos guiados como un videojuego, visualización de datos y una aplicación web.',
    copies: 3,
  },
  {
    title: 'Inteligencia artificial: un enfoque moderno',
    authors: ['Stuart Russell', 'Peter Norvig'],
    year: 2010,
    publisher: 'Pearson',
    category: 'Inteligencia Artificial',
    pages: 1152,
    tags: ['inteligencia artificial', 'agentes', 'búsqueda', 'aprendizaje automático'],
    synopsis:
      'El texto de referencia en IA: agentes inteligentes, búsqueda, lógica, planificación, razonamiento con incertidumbre, aprendizaje automático, procesamiento de lenguaje natural y visión por computadora.',
    copies: 2,
  },
  {
    title: 'Deep Learning',
    authors: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
    year: 2016,
    publisher: 'MIT Press',
    category: 'Inteligencia Artificial',
    language: 'Inglés',
    pages: 800,
    tags: ['redes neuronales', 'aprendizaje profundo', 'matemáticas'],
    synopsis:
      'Fundamentos matemáticos y prácticos del aprendizaje profundo: álgebra lineal, probabilidad, optimización, redes convolucionales y recurrentes, y modelos generativos.',
    copies: 1,
  },
  {
    title: 'Domain-Driven Design',
    authors: ['Eric Evans'],
    year: 2003,
    publisher: 'Addison-Wesley',
    category: 'Programación',
    language: 'Inglés',
    pages: 560,
    tags: ['ddd', 'modelado de dominio', 'arquitectura de software'],
    synopsis:
      'Propone diseñar software complejo a partir de un modelo del dominio compartido con los expertos del negocio: lenguaje ubicuo, entidades, agregados, repositorios y contextos delimitados.',
    copies: 1,
  },
  {
    title: 'Sapiens: De animales a dioses',
    authors: ['Yuval Noah Harari'],
    year: 2011,
    publisher: 'Debate',
    category: 'Historia',
    pages: 496,
    tags: ['historia de la humanidad', 'evolución', 'sociedad'],
    synopsis:
      'Repaso de la historia humana a través de tres revoluciones: la cognitiva, la agrícola y la científica. Analiza cómo los mitos compartidos permitieron la cooperación a gran escala.',
    copies: 3,
  },
  {
    title: 'El mundo de Sofía',
    authors: ['Jostein Gaarder'],
    year: 1991,
    publisher: 'Siruela',
    category: 'Filosofía',
    pages: 640,
    tags: ['historia de la filosofía', 'novela', 'principiantes'],
    synopsis:
      'Sofía, una adolescente, recibe cartas misteriosas que la introducen en la historia de la filosofía, desde los presocráticos hasta el siglo XX. Una novela que funciona como curso introductorio.',
    copies: 2,
  },
  {
    title: 'Pensar rápido, pensar despacio',
    authors: ['Daniel Kahneman'],
    year: 2011,
    publisher: 'Debate',
    category: 'Psicología',
    pages: 672,
    tags: ['sesgos cognitivos', 'toma de decisiones', 'economía conductual'],
    synopsis:
      'Describe dos sistemas de pensamiento, uno rápido e intuitivo y otro lento y deliberado, y muestra los sesgos que afectan nuestras decisiones cotidianas y económicas.',
    copies: 2,
  },
  {
    title: 'El hombre en busca de sentido',
    authors: ['Viktor Frankl'],
    year: 1946,
    publisher: 'Herder',
    category: 'Psicología',
    pages: 168,
    tags: ['logoterapia', 'resiliencia', 'testimonio'],
    synopsis:
      'Testimonio de un psiquiatra sobreviviente de los campos de concentración y presentación de la logoterapia: la idea de que encontrar un propósito ayuda a sobrellevar el sufrimiento.',
    copies: 2,
  },
  {
    title: 'La riqueza de las naciones',
    authors: ['Adam Smith'],
    year: 1776,
    publisher: 'Alianza',
    category: 'Economía',
    pages: 800,
    tags: ['economía clásica', 'mercado', 'división del trabajo'],
    synopsis:
      'Obra fundacional de la economía política: analiza la división del trabajo, el comercio, el valor de las mercancías y el papel del mercado en la prosperidad de los países.',
    copies: 1,
  },
  {
    title: 'Visión de los vencidos',
    authors: ['Miguel León-Portilla'],
    year: 1959,
    publisher: 'UNAM',
    category: 'Historia',
    pages: 224,
    tags: ['conquista de méxico', 'fuentes indígenas', 'historia de méxico'],
    synopsis:
      'Antología de testimonios indígenas, traducidos del náhuatl, que narran la conquista de México desde la perspectiva de los pueblos mesoamericanos.',
    copies: 2,
  },
  {
    title: 'Álgebra lineal y sus aplicaciones',
    authors: ['David C. Lay'],
    year: 2012,
    publisher: 'Pearson',
    category: 'Matemáticas',
    pages: 576,
    tags: ['álgebra lineal', 'matrices', 'vectores', 'universitario'],
    synopsis:
      'Curso de álgebra lineal orientado a aplicaciones: sistemas de ecuaciones, matrices, espacios vectoriales, valores propios y mínimos cuadrados, con ejemplos de ingeniería y computación.',
    copies: 2,
  },
];
