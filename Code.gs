/**
 * Сайт бронирования VR-шлемов для таблицы «Учёт проката VR».
 * Это ОТДЕЛЬНЫЙ проект Apps Script (script.google.com), он не мешает
 * скриптам, которые уже есть в самой таблице.
 */

const SPREADSHEET_ID = '1tr8Dfn2l2PF4mEN1ykBQ4iH7VY577JBF8-jf8yY4mDc';

const SHEET_VR = 'Шлемы';       // A: VR ID, B: Название, C: Статус, D: Клиент, E: Телефон, F: Дата возврата, G: ID аренды / брони
const SHEET_BOOK = 'Брони';     // ID брони, Имя клиента, Телефон, VR ID, Начало брони, Конец брони, Статус, Паспорт, Оплата
const SHEET_SET = 'Настройки';  // Настройка | Значение
const SHEET_GAMES = 'Игры';     // Название | Жанр | Возраст | Описание | Трейлер (ссылка YouTube) | Фото (необязательно)

const FREE = 'Свободен';           // шлем можно бронировать
const BOOKED = 'Забронирован';     // что ставится шлему после брони с сайта
const BOOKING_STATUS = 'Проверить оплату';         // бронь с оплатой переводом
const CASH_STATUS = 'Наличные — подтвердить';      // бронь с оплатой наличными при получении
const CONFIRMED_STATUS = 'Подтверждена';           // админ подтвердил бронь
const CANCELED_STATUS = 'Отменена';                // админ отменил бронь — шлем снова свободен
const ISSUED_STATUS = 'Выдан';                     // админ выдал устройство клиенту
const RETURNED_STATUS = 'Возвращён';               // клиент вернул устройство — оно снова свободно
const DATE_FORMAT = 'dd.MM.yyyy HH:mm';

// Новые частые вопросы. setup допишет их в конец ячейки «Сайт: Частые вопросы», если их там ещё нет.
const FAQ_EXTRA =
  'Можно ли играть вместе, если взять 2 шлема?\n' +
  'Да! Можно играть вместе онлайн — в кооперативные и командные игры. Такие игры отмечены значком «Вместе» в разделе «Игры».\n' +
  '\n' +
  'Для чего нужно фото паспорта?\n' +
  'Это условие аренды. Фото конфиденциально — его не видит никто, кроме владельца проката.\n' +
  '\n' +
  'Можно ли играть без интернета?\n' +
  'Да. Большая часть игр на шлеме работает без интернета. Интернет нужен только для онлайн-игр и видео.';

// Текст подарка на плитке «3 суток» (по умолчанию)
const GIFT_TEXT = '🎁 Доставка от 3х суток бесплатно';

// Актуальное с отзывами в Instagram. Используется, если строка «Сайт: отзывы в Instagram (ссылка)» пустая.
const REVIEWS_LINK = 'https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDgwMTM0Mzk2NTYxMzU0';

// Эти строки добавятся в «Настройки», если их там ещё нет (функция setup).
const DEFAULT_SETTINGS = [
  ['Сайт: название', 'WAY_VR'],
  ['Сайт: фото шлема', 'https://drive.google.com/file/d/1E5MHXxz3XtOlE97hqVGL2sTY_9Th5Pr6/view'],
  ['Сайт: цена 1 сутки', 2000],
  ['Сайт: цена 2 суток', 3500],
  ['Сайт: цена 3 суток', 4500],
  ['Сайт: цена каждых следующих суток', 1500],
  // Подарок при аренде от 3 суток — показывается на плитке «3 суток» и в форме. Пусто — не показывать.
  ['Сайт: подарок от 3 суток', GIFT_TEXT],
  // Разделы сайта. Раздел определяется по началу ID в листе «Шлемы»: VR-01 → раздел VR, RB-01 → раздел RB.
  ['Сайт: VR название раздела', 'VR-шлемы Meta Quest 3'],
  ['Сайт: VR описание', 'Meta Quest 3 с удобным креплением BOBOVR S3 Pro: шлем не давит на лицо, ' +
    'вес распределён равномерно, есть дополнительный аккумулятор — можно играть дольше.\n' +
    'В комплекте: шлем, 2 контроллера, зарядка.\n' +
    'Подходит для детей от 10 лет и взрослых.'],
  ['Сайт: RB название раздела', 'Очки Ray-Ban Meta (оригинал)'],
  ['Сайт: RB описание', 'Оригинальные умные очки Ray-Ban Meta.\n' +
    '• Фото и видео от первого лица — камера в оправе, снимать можно одной кнопкой или голосом.\n' +
    '• Встроенные динамики и микрофоны — музыка и звонки без наушников.\n' +
    '• Выглядят как обычные солнцезащитные очки Ray-Ban.\n' +
    'В комплекте: очки и зарядный кейс.'],
  ['Сайт: RB фото', 'https://drive.google.com/file/d/132kSQO44aKpQK60GCAF25zTcvxEyvsql/view'],
  ['Сайт: RB цена 1 сутки', 1500],
  ['Сайт: RB цена 2 суток', 2500],
  ['Сайт: RB цена 3 суток', 3500],
  ['Сайт: RB цена каждых следующих суток', 1000],
  ['Сайт: получатель', 'Имя Ф.'],
  ['Сайт: банк', 'Сбербанк'],
  ['Сайт: номер карты', ''],
  // Карты по банкам — на сайте показываются с логотипом банка. Пустую строку сайт не покажет.
  ['Сайт: карта Сбербанк', '5469980473873376'],
  ['Сайт: карта Т-Банк', '5536914119978736'],
  ['Сайт: телефон для СБП', ''],
  ['Сайт: куда прислать чек (ссылка)', ''],
  // Номер для кнопки «Написать в WhatsApp». Пусто — возьмётся номер из ссылки для чека (wa.me/…) или телефон СБП.
  ['Сайт: WhatsApp для вопросов', ''],
  // Раздел «О прокате». Блоки разделяются пустой строкой: первая строка блока — заголовок,
  // строки с «•» — пункты списка, остальные — обычный текст.
  ['Сайт: О прокате',
    '🚚 Доставка и получение\n' +
    '• Бесплатная доставка по Грозному при аренде от 3 суток\n' +
    '• Доступен самовывоз\n' +
    '• Можно забронировать заранее на удобную дату\n' +
    '\n' +
    '🧼 Чистота оборудования\n' +
    'После каждого проката шлем очищается, дезинфицируется и проверяется.\n' +
    '\n' +
    '📋 Условия аренды\n' +
    '• Для оформления нужны фото главной страницы паспорта и страницы с регистрацией\n' +
    '• Залог не требуется'],
  // Раздел «Частые вопросы». Вопросы разделяются пустой строкой: первая строка — вопрос, остальные — ответ.
  ['Сайт: Частые вопросы',
    'Можно ли играть без телевизора и компьютера?\n' +
    'Да. Игры уже встроены в шлем, ничего подключать не нужно. Достаточно свободного места в комнате примерно 2 × 2 метра.\n' +
    '\n' +
    'Можно ли транслировать изображение с VR на телевизор?\n' +
    'Да, если ваш телевизор поддерживает Chromecast (передачу изображения).\n' +
    '\n' +
    'Как разобраться, как пользоваться шлемом?\n' +
    'Мы сделали пошаговую видеоинструкцию — разберётся даже тот, кто никогда не играл в VR.\n' +
    '\n' +
    'Если мы сломаем шлем, придётся платить полную стоимость?\n' +
    'Нет. Мы оцениваем ущерб по стоимости запчастей и работы мастера и называем цену. Всегда стараемся максимально пойти навстречу клиенту 🤝\n' +
    '\n' +
    'Вы сами привозите шлем?\n' +
    'Доставка по Грозному бесплатная при аренде от 3 суток, в остальных случаях — по тарифу такси. Забираем так же. ' +
    'Можно и самовывоз: забрать и вернуть самостоятельно.\n' +
    '\n' +
    'На сколько хватает заряда?\n' +
    '2–3 часа непрерывной игры. Плюс съёмный аккумулятор, который продлевает работу ещё примерно на столько же.\n' +
    '\n' +
    'Можно ли подключить шлем к компьютеру?\n' +
    'Да, шлем можно подключить к ПК и играть в игры из Steam.\n' +
    '\n' +
    'Можно ли смотреть YouTube и фильмы онлайн — в том числе вместе?\n' +
    'Да, можно.\n' +
    '\n' + FAQ_EXTRA],
  // Отзывы: ссылка на актуальное с отзывами в Instagram (актуальное → ⋯ → Копировать ссылку). Пусто — раздела не будет.
  ['Сайт: отзывы в Instagram (ссылка)', REVIEWS_LINK],
  ['Сайт: Telegram токен бота', ''],
  ['Сайт: Telegram chat_id', ''],
  ['Сайт: Игры название раздела', 'Игры на VR-шлеме'],
  // Оплата наличными при получении: «да» — показывать на сайте, «нет» — только перевод
  ['Сайт: оплата наличными', 'да'],
  // Сколько броней за наличные может одновременно ждать вашего звонка. Больше — сайт попросит оплатить переводом.
  ['Сайт: наличные — максимум неподтверждённых броней', 2],
  // Какой статус ставить шлему в листе «Шлемы», когда в админке нажали «Выдан»
  ['Сайт: статус шлема при выдаче', 'В аренде'],
];

// Игры для листа «Игры» — добавятся, только если листа ещё нет. Дальше меняйте их прямо в таблице.
const GAMES_HEADER = ['Название', 'Жанр', 'Возраст', 'Описание', 'Трейлер (ссылка YouTube)', 'Фото (необязательно)'];
const DEFAULT_GAMES = [
  ['HITMAN 3 VR: Reloaded', 'Стелс / экшен', '18+', 'Станьте Агентом 47: проникайте на закрытые вечеринки, ' +
    'переодевайтесь, прячьтесь и выполняйте контракты так, как придумаете сами.', 'https://www.youtube.com/watch?v=GahlBZqbaow'],
  ['Marvel’s Deadpool VR', 'Экшен / комедия', '18+', 'Дэдпул в VR: безумные драки мечами и пистолетами, ' +
    'чёрный юмор и болтовня без остановки. Новая большая игра Marvel для Quest 3.', 'https://www.youtube.com/watch?v=Lmm0qSBF_iQ'],
  ['Hazard Us', 'Кооператив (можно играть вместе)', '6+', 'Проходите ловушки и головоломки командой: ' +
    'помогайте друг другу, договаривайтесь и спасайтесь вместе. Весело играть с друзьями и всей семьёй.', 'https://www.youtube.com/watch?v=x4vP6VoUuWg'],
  ['I Am Security', 'Симулятор / юмор', '12+', '«Please step aside, I am security!» — станьте охранником ' +
    'ночного клуба или аэропорта: проверяйте документы, ищите запрещённое и не пускайте нарушителей.', 'https://www.youtube.com/watch?v=Op4nC8Bn-v0'],
  ['LaserTag', 'Кооператив (можно играть вместе)', '', 'Лазертаг прямо у вас дома: комната превращается в арену, ' +
    'игроки бегают, прячутся и стреляют друг в друга лазерами. Играйте вместе с друзьями — нужно несколько шлемов.',
    'https://www.youtube.com/watch?v=T1PIcuOYmXU'],
  ['Population: One', 'Кооператив (можно играть вместе)', '12+', 'Королевская битва в VR: собирайтесь в команду ' +
    'по трое, лазайте по любым стенам, летайте на крыльях и сражайтесь за победу. Можно играть вместе с друзьями.',
    'https://www.youtube.com/watch?v=k7INK9V1zjQ'],
  ['AIM XR', 'Кооператив (можно играть вместе)', '16+', 'Командный шутер: перестрелки на разных картах, ' +
    'много оружия и режимов. Играйте вместе с друзьями в одной команде или друг против друга.',
    'https://www.youtube.com/watch?v=jlLhuFiBAN4'],
  ['Hard Bullet', 'Экшен / шутер', '18+', 'Боевик с реалистичной физикой: стреляйте, деритесь, используйте ' +
    'всё, что под рукой, и замедляйте время, как в кино.', 'https://www.youtube.com/watch?v=QMfgy0M5o6k'],
  ['I Am Monkey', 'Юмор / приключение', '12+', 'Станьте обезьяной, которая сбежала из зоопарка: лазайте, ' +
    'хулиганьте, дразните посетителей и устраивайте весёлый хаос. От создателей I Am Cat.',
    'https://www.youtube.com/watch?v=LJCfvsjFybM'],
  ['I Am Cat', 'Кооператив (можно играть вместе)', '6+', 'Станьте котом и хулиганьте в доме у бабушки: ' +
    'роняйте вещи, прячьтесь, лазайте по шкафам. Можно играть вместе — несколько котов в одном доме.',
    'https://www.youtube.com/watch?v=PpjV6dkZf6o'],
  ['Pavlov Shack', 'Шутер / онлайн', '16+', 'Командный шутер в духе Counter-Strike: закладывайте бомбу, ' +
    'обезвреживайте, сражайтесь с игроками онлайн. Реалистичная перезарядка и стрельба руками.',
    'https://www.youtube.com/watch?v=nii-GDGRrR0'],
  ['Arizona Sunshine 2', 'Шутер / зомби', '18+', 'Продолжение знаменитого зомби-шутера: путешествуйте ' +
    'по постапокалиптической Аризоне вместе с верным псом Бадди и отстреливайте орды мертвецов.',
    'https://www.youtube.com/watch?v=aNWKBb1P9ng'],
  ['The Thrill of the Fight 2', 'Спорт / бокс', '12+', 'Самый реалистичный бокс в VR: настоящие удары, ' +
    'уклоны и усталость. Отличная тренировка — после пары раундов вы будете мокрыми.',
    'https://www.youtube.com/watch?v=kLcRgVrSK3Y'],
  ['Taxi Driver VR', 'Симулятор / юмор', '16+', 'Станьте таксистом в безумном городе: возите пассажиров, ' +
    'зарабатывайте и попадайте в самые неожиданные ситуации.', 'https://www.youtube.com/watch?v=FAx3u_GF28Q'],
  ['Richie’s Plank Experience', 'Высота / для всех', '6+', 'Поднимитесь на лифте на крышу небоскрёба ' +
    'и пройдите по узкой доске над городом. Проверка на страх высоты — очень смешно смотреть со стороны.',
    'https://www.youtube.com/watch?v=faNsP7ExSt0'],
  ['Spatial Zombies Pro', 'Смешанная реальность / зомби', '16+', 'Зомби лезут прямо в вашу комнату: ' +
    'шлем показывает вашу квартиру, а вы отбиваетесь от орд мертвецов.', 'https://www.youtube.com/watch?v=Ja8KykK0fI8'],
  ['Stop Please', 'Симулятор / юмор', '12+', 'Станьте пограничником: проверяйте машины и людей, ' +
    'ищите контрабанду и решайте, кого пропустить, а кого задержать.', 'https://www.youtube.com/watch?v=Mnp09dJXxXo'],
  ['GTA San Andreas VR', 'Экшен / открытый мир', '18+', 'Легендарная GTA San Andreas от первого лица: ' +
    'Лос-Сантос, машины, погони и перестрелки — теперь вокруг вас.', 'https://www.youtube.com/watch?v=9NAW-5CKdFc'],
  ['Dragon Fist: VR Kung Fu', 'Единоборства / кунг-фу', '12+', 'Станьте мастером кунг-фу: ' +
    'блокируйте, уклоняйтесь и проводите приёмы против множества противников.', 'https://www.youtube.com/watch?v=EpvHiA2_fr8'],
  ['Angry Birds VR: Isle of Pigs', 'Головоломка / для детей', '6+', 'Знаменитые злые птицы в VR: ' +
    'натягивайте рогатку руками и разрушайте крепости свиней. Нравится детям и взрослым.',
    'https://www.youtube.com/watch?v=87cBPQlTJgw'],
  ['NightClub Simulator VR', 'Симулятор / юмор', '18+', 'Безумный ночной клуб: танцуйте, устраивайте ' +
    'хаос и драки, творите что угодно — полная свобода и много смеха.', 'https://www.youtube.com/watch?v=JcIGfyPgiFc'],
  ['Mini Market Simulator VR', 'Симулятор / магазин', '6+', 'Откройте свой магазин: расставляйте товары, ' +
    'обслуживайте покупателей на кассе и развивайте маленький ларёк в большой супермаркет.',
    'https://www.youtube.com/watch?v=H1HUNYiSx4k'],
  ['Barbershop Simulator VR', 'Симулятор / юмор', '12+', 'Станьте барбером: стригите, брейте и красьте ' +
    'клиентов. Получится шедевр или катастрофа — зависит только от вас.', 'https://www.youtube.com/watch?v=0m_QNpeG3tA'],
  ['BONELAB', 'Экшен / физика', '16+', 'Экшен-песочница с полной физикой тела: стреляйте, деритесь, ' +
    'лазайте и экспериментируйте. Можно делать почти всё, что придёт в голову.', 'https://www.youtube.com/watch?v=UzximcHLn34'],
  ['Death Horizon: Reloaded', 'Шутер / зомби', '18+', 'Динамичный зомби-шутер: прорывайтесь через ' +
    'заражённый город, отстреливайтесь и выживайте до конца.', 'https://www.youtube.com/watch?v=q0FwZiLpsbc'],
  ['Squat Game VR', 'Приключение / тренировка', '6+', 'Платформер, где вы двигаетесь своим телом: ' +
    'приседайте, прыгайте и уворачивайтесь от препятствий. Весело и полезно для ног.',
    'https://www.youtube.com/watch?v=8X8yIEblEn0'],
  ['Scary Hot Dogs', 'Симулятор / хоррор-юмор', '12+', 'Откройте ларёк с хот-догами, где покупатели — ' +
    'монстры и привидения. Готовьте быстро и не злите клиентов! От создателей I Am Cat.',
    'https://www.youtube.com/watch?v=ccNFK_4P2s4'],
  ['Beat Saber', 'Ритм / музыка', '6+', 'Рубите световыми мечами блоки под музыку. Самая популярная VR-игра: подходит всем, ' +
    'отлично заходит на вечеринках и хорошо разминает.', 'https://www.youtube.com/watch?v=1DJwC2kYrl8'],
  ['Batman: Arkham Shadow', 'Экшен / приключение', '16+', 'Станьте Бэтменом: драки, гаджеты, расследования ' +
    'и полёты над Готэмом. Большая сюжетная игра специально для Quest 3.', 'https://www.youtube.com/watch?v=XpN_Abd1RQc'],
  ['Asgard’s Wrath 2', 'Ролевая игра', '16+', 'Огромное приключение в мире египетских и скандинавских богов: ' +
    'сражения, загадки, путешествия. Больше 60 часов игры.', 'https://www.youtube.com/watch?v=S5K_oRj63Bg'],
  ['SUPERHOT VR', 'Экшен / головоломка', '16+', 'Время движется, только когда двигаетесь вы. Уворачивайтесь от пуль ' +
    'в замедленной съёмке и обезвреживайте врагов, как в кино.', 'https://www.youtube.com/watch?v=VeqHQ_Y8BUw'],
  ['Resident Evil 4 VR', 'Хоррор / шутер', '18+', 'Легендарный хоррор полностью в VR: деревня, заражённые жители ' +
    'и спасение дочери президента. Для любителей острых ощущений.', 'https://www.youtube.com/watch?v=yI8Am_D81t0'],
  ['The Walking Dead: Saints & Sinners', 'Хоррор / выживание', '18+', 'Выживайте в затопленном Новом Орлеане ' +
    'среди зомби: собирайте припасы, мастерите оружие, делайте выбор.', 'https://www.youtube.com/watch?v=vxf5dFQy31c'],
  ['Pistol Whip', 'Ритм / шутер', '12+', 'Боевик под музыку: стреляйте в такт, уклоняйтесь от пуль ' +
    'и чувствуйте себя героем экшен-фильма. Хорошая кардио-тренировка.', 'https://www.youtube.com/watch?v=xU_hjl7JI2k'],
  ['Blade & Sorcery: Nomad', 'Экшен / фэнтези', '18+', 'Средневековые бои с честной физикой: мечи, луки, магия. ' +
    'Каждый удар ощущается по-настоящему.', 'https://www.youtube.com/watch?v=7qeEedPf8lo'],
  ['Creed: Rise to Glory', 'Спорт / бокс', '12+', 'Бокс по мотивам фильмов «Крид» и «Рокки»: тренировки, ' +
    'карьера и бои с соперниками. Настоящая тренировка — пропотеете.', 'https://www.youtube.com/watch?v=keD04yqjElw'],
  ['Eleven Table Tennis', 'Спорт', '6+', 'Самый реалистичный настольный теннис в VR. Играйте с компьютером ' +
    'или с людьми онлайн, можно прямо в своей комнате.', 'https://www.youtube.com/watch?v=l7-z0yPUWdA'],
  ['Job Simulator', 'Юмор / для всей семьи', '6+', 'Весёлая игра про «работу» в мире роботов: готовьте еду, ' +
    'чините машины, работайте в офисе. Отличный первый опыт VR, нравится детям.', 'https://www.youtube.com/watch?v=O2tvoeJxLSU'],
  ['Gorilla Tag', 'Онлайн / для детей', '10+', 'Бегайте и лазайте на руках, как горилла, и играйте в догонялки ' +
    'с игроками со всего мира. Очень популярна у детей и подростков.', 'https://www.youtube.com/watch?v=t3Lsxq7dAO8'],
];

// Таблицу открываем один раз за запуск — каждое открытие занимает время
let ss__ = null;
function ss_() { return ss__ || (ss__ = SpreadsheetApp.openById(SPREADSHEET_ID)); }

/** Ответ в формате JSON — для сайта на своём домене. */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Сайт на своём домене отправляет бронь сюда (POST). Ответ: {ok:true, data} или {ok:false, error}. */
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'book') return json_({ ok: true, data: book(req.arg || {}) });
    if (req.action === 'admin') return json_({ ok: true, data: admin_(req.arg || {}) });
    throw new Error('Неизвестный запрос.');
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Открывает сайт. С ?api=data — отдаёт данные для сайта на своём домене.
 *  Список шлемов и игр сразу вкладываем в страницу — без второго запроса, сайт открывается быстрее. */
function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'data') {
    try { return json_({ ok: true, data: getData() }); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  const t = HtmlService.createTemplateFromFile('Index');
  let init = 'null';
  try {
    // «/» и «<» экранируем: так данные не сломают страницу
    init = JSON.stringify(getData()).replace(/</g, '\\u003c').replace(/\//g, '\\/');
  } catch (e) { /* не получилось — страница загрузит список сама */ }
  t.initJson = init;
  return t.evaluate()
    .setTitle('WAY_VR — прокат VR')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Запустить один раз: добавит в «Настройки» строки для сайта и создаст лист «Игры». Остальные данные не трогает. */
function setup() {
  const ss = ss_();
  const sh = ss.getSheetByName(SHEET_SET);
  const vals = sh.getDataRange().getValues();
  const have = vals.map(r => String(r[0]).trim());
  DEFAULT_SETTINGS.forEach(([k, v]) => { if (have.indexOf(k) < 0) sh.appendRow([k, v]); });
  // Старое название по умолчанию меняем на новое (своё название, если вы его вписали, не трогаем)
  const t = have.indexOf('Сайт: название');
  if (t >= 0 && String(vals[t][1]).trim() === 'VR Прокат') sh.getRange(t + 1, 2).setValue('WAY_VR');
  // Строка отзывов добавлена раньше пустой — впишем ссылку на актуальное
  const rv = have.indexOf('Сайт: отзывы в Instagram (ссылка)');
  if (rv >= 0 && String(vals[rv][1]).trim() === '') sh.getRange(rv + 1, 2).setValue(REVIEWS_LINK);
  // Новые частые вопросы дописываем в конец (ваши вопросы и правки не трогаем; уже добавленные — не повторяем)
  const fq = have.indexOf('Сайт: Частые вопросы');
  if (fq >= 0) {
    let cur = String(vals[fq][1] || '').replace(/\r/g, '').trim();
    const add = FAQ_EXTRA.split(/\n\s*\n/).filter(b => cur.indexOf(b.split('\n')[0].trim()) < 0);
    if (add.length) sh.getRange(fq + 1, 2).setValue((cur ? cur + '\n\n' : '') + add.join('\n\n'));
  }
  // Старый текст подарка меняем на новый (свой текст, если вы его вписали, не трогаем)
  const gf = have.indexOf('Сайт: подарок от 3 суток');
  if (gf >= 0 && String(vals[gf][1]).trim() === '🎁 доставка бесплатно') sh.getRange(gf + 1, 2).setValue(GIFT_TEXT);
  // В «Бронях» колонка I — способ оплаты (Перевод / Наличные)
  const bk = ss.getSheetByName(SHEET_BOOK);
  if (bk && String(bk.getRange(1, 9).getValue()).trim() === '') bk.getRange(1, 9).setValue('Оплата').setFontWeight('bold');
  // Пароль для страницы админа — случайный, создаётся один раз. Посмотреть или поменять — в «Настройках».
  if (have.indexOf('Сайт: пароль админа') < 0)
    sh.appendRow(['Сайт: пароль админа', Utilities.getUuid().replace(/-/g, '').slice(0, 10)]);

  if (!ss.getSheetByName(SHEET_GAMES)) {
    const g = ss.insertSheet(SHEET_GAMES);
    const rows = [GAMES_HEADER].concat(DEFAULT_GAMES.map(r => r.concat(['']))); // пустое «Фото» — возьмётся кадр из трейлера
    g.getRange(1, 1, rows.length, GAMES_HEADER.length).setValues(rows);
    g.getRange(1, 1, 1, GAMES_HEADER.length).setFontWeight('bold').setBackground('#ede7f6');
    g.setFrozenRows(1);
    g.setColumnWidths(1, 3, 160);
    g.setColumnWidth(4, 420);
    g.setColumnWidths(5, 2, 300);
    g.getRange(2, 4, rows.length - 1, 1).setWrap(true);
  } else {
    // Лист уже есть — допишем только игры, которых в нём нет (по названию)
    const g = ss.getSheetByName(SHEET_GAMES);
    const names = g.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase());
    DEFAULT_GAMES.forEach(r => { if (names.indexOf(r[0].toLowerCase()) < 0) g.appendRow(r.concat([''])); });
  }
}

function settings_() {
  const out = {};
  ss_().getSheetByName(SHEET_SET).getDataRange().getValues().forEach(r => {
    if (r[0] !== '') out[String(r[0]).trim()] = r[1];
  });
  return out;
}

/** Раздел по ID устройства: «RB-01» → «RB». Без дефиса — раздел VR. */
function cat_(id) {
  const m = /^([A-Za-zА-Яа-яЁё]+)-/.exec(String(id).trim());
  return m ? m[1].toUpperCase() : 'VR';
}

/** Тарифы раздела. Для VR — старые строки «Сайт: цена …», для других — «Сайт: RB цена …». */
function prices_(s, cat) {
  const num = v => Number(String(v).replace(/\s/g, ''));
  const n = (k, d) => {
    const own = cat && cat !== 'VR' ? s['Сайт: ' + cat + ' ' + k] : undefined;
    const v = own !== undefined && own !== '' ? own : s['Сайт: ' + k];
    return num(v) || d;
  };
  return {
    p1: n('цена 1 сутки', 2000),
    p2: n('цена 2 суток', 3500),
    p3: n('цена 3 суток', 4500),
    extra: n('цена каждых следующих суток', 1500),
  };
}

function priceFor_(p, days) {
  if (days === 1) return p.p1;
  if (days === 2) return p.p2;
  return p.p3 + (days - 3) * p.extra;
}

/** Данные для сайта: шлемы, цены, реквизиты. Личные данные клиентов наружу не отдаются. */
function getData() {
  const s = settings_();
  const str = k => String(s[k] || '').trim();
  const cats = {};
  const order = [];
  ss_().getSheetByName(SHEET_VR).getDataRange().getValues().slice(1)
    .filter(r => r[0] !== '')
    .forEach(r => {
      const id = String(r[0]).trim();
      const c = cat_(id);
      if (!cats[c]) {
        const catPhoto = str('Сайт: ' + c + ' фото') || (c === 'VR' ? str('Сайт: фото шлема') : '');
        cats[c] = {
          key: c,
          title: str('Сайт: ' + c + ' название раздела') || (c === 'VR' ? 'VR-шлемы' : c),
          desc: str('Сайт: ' + c + ' описание'),
          photo: imgUrl_(catPhoto),
          prices: prices_(s, c),
          items: [],
        };
        order.push(c);
      }
      cats[c].items.push({
        id: id,
        name: String(r[1] || id),
        free: String(r[2]).trim() === FREE,
        // своё фото: строка «Сайт: фото VR-03» в Настройках, иначе фото раздела
        photo: imgUrl_(s['Сайт: фото ' + id]) || cats[c].photo,
      });
    });
  order.sort((a, b) => (a === 'VR' ? -1 : b === 'VR' ? 1 : 0)); // VR-шлемы всегда первыми
  return {
    cats: order.map(c => cats[c]),
    gamesTitle: str('Сайт: Игры название раздела') || 'Игры на VR-шлеме',
    games: games_(),
    about: str('Сайт: О прокате'),
    faq: str('Сайт: Частые вопросы'),
    // своя ссылка из «Настроек»; пусто — ссылка на актуальное по умолчанию; «нет» — раздел скрыт
    reviewsLink: /^https:\/\//.test(str('Сайт: отзывы в Instagram (ссылка)')) ? str('Сайт: отзывы в Instagram (ссылка)')
      : /^нет$/i.test(str('Сайт: отзывы в Instagram (ссылка)')) ? '' : REVIEWS_LINK,
    settings: {
      title: str('Сайт: название') || 'WAY_VR',
      receiver: str('Сайт: получатель'),
      cards: [['sber', 'Сбербанк'], ['tbank', 'Т-Банк']]
        .map(([key, bank]) => ({ key: key, bank: bank, number: str('Сайт: карта ' + bank) }))
        .filter(c => c.number),
      bank: str('Сайт: банк'),
      card: str('Сайт: номер карты'),
      sbp: str('Сайт: телефон для СБП'),
      receipt: str('Сайт: куда прислать чек (ссылка)'),
      cash: cashOn_(s),
      gift: str('Сайт: подарок от 3 суток'),
      whatsapp: str('Сайт: WhatsApp для вопросов'),
    },
  };
}

/** Игры из листа «Игры». Нет листа — раздел на сайте просто не показывается. */
function games_() {
  const sh = ss_().getSheetByName(SHEET_GAMES);
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[0]).trim() !== '')
    .map(r => {
      const video = ytId_(r[4]);
      return {
        title: String(r[0]).trim(),
        genre: String(r[1] || '').trim(),
        age: String(r[2] || '').trim(),
        desc: String(r[3] || '').trim(),
        video: video,
        // фото: своя ссылка, иначе кадр из трейлера
        photo: imgUrl_(r[5]) || (video ? 'https://i.ytimg.com/vi/' + video + '/hqdefault.jpg' : ''),
      };
    });
}

/** ID ролика из любой ссылки YouTube (watch?v=, youtu.be/, shorts/, embed/). */
function ytId_(u) {
  u = String(u || '').trim();
  const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/.exec(u);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(u) ? u : '';
}

/** Ссылку Google Диска превращает в прямую ссылку на картинку; обычные ссылки на фото оставляет как есть. */
function imgUrl_(u) {
  u = String(u || '').trim();
  if (!u) return '';
  const m = /drive\.google\.com\/.*(?:\/d\/|[?&]id=)([\w-]{20,})/.exec(u);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w600'; // 600px хватает и для чётких экранов, грузится быстрее
  return /^https:\/\//.test(u) ? u : '';
}

/* ===================== Страница админа ===================== */

/** Запросы со страницы админа: {key, cmd: 'list' | 'confirm' | 'cancel', id}. */
function admin_(arg) {
  checkAdminKey_(arg.key);
  if (['confirm', 'cancel', 'issue', 'return'].indexOf(arg.cmd) >= 0) adminSet_(String(arg.id || ''), arg.cmd);
  else if (arg.cmd !== 'list') throw new Error('Неизвестная команда.');
  return { bookings: adminList_() };
}

/** Проверка пароля. После 10 неверных попыток — пауза 10 минут (защита от подбора). */
function checkAdminKey_(key) {
  const pass = String(settings_()['Сайт: пароль админа'] || '').trim();
  if (pass.length < 6) throw new Error('Пароль админа не задан: запустите setup и посмотрите строку «Сайт: пароль админа» в «Настройках».');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('adminFails') || 0);
  if (fails >= 10) throw new Error('Слишком много неверных попыток. Подождите 10 минут.');
  if (String(key || '').trim() !== pass) {
    cache.put('adminFails', String(fails + 1), 600);
    throw new Error('Неверный пароль.');
  }
}

/** Брони, которые ждут решения, и подтверждённые (до дня после окончания). Новые — первыми. */
function adminList_() {
  const ss = ss_();
  const s = settings_();
  const tz = String(s['Часовой пояс'] || 'Europe/Moscow');
  const fmt = d => d instanceof Date ? Utilities.formatDate(d, tz, DATE_FORMAT) : String(d || '');
  const names = {};
  ss.getSheetByName(SHEET_VR).getDataRange().getValues().slice(1).forEach(r => { names[String(r[0])] = String(r[1] || r[0]); });
  const rng = ss.getSheetByName(SHEET_BOOK).getDataRange();
  const vals = rng.getValues();
  const rich = rng.getRichTextValues();
  const now = Date.now();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const status = String(r[6]).trim();
    if (!r[0] || [BOOKING_STATUS, CASH_STATUS, CONFIRMED_STATUS, ISSUED_STATUS].indexOf(status) < 0) continue;
    if (status === CONFIRMED_STATUS && r[5] instanceof Date && r[5].getTime() < now - 864e5) continue;
    const rt = rich[i] && rich[i][7];
    const passports = rt ? rt.getRuns().map(x => ({ t: x.getText().trim(), url: x.getLinkUrl() })).filter(x => x.url) : [];
    out.push({ id: String(r[0]), name: String(r[1]), phone: String(r[2]).replace(/^'/, ''), device: String(r[3]),
      deviceName: names[String(r[3])] || String(r[3]), start: fmt(r[4]), end: fmt(r[5]), status: status,
      pay: String(r[8] || ''), passports: passports });
  }
  return out.reverse();
}

/** Подтвердить или отменить бронь. При отмене шлем снова «Свободен», если ещё не выдан. */
function adminSet_(id, cmd) {
  if (!id) throw new Error('Не указана бронь.');
  const ss = ss_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const bk = ss.getSheetByName(SHEET_BOOK);
    const rows = bk.getDataRange().getValues();
    const i = rows.findIndex((r, n) => n > 0 && String(r[0]) === id);
    if (i < 0) throw new Error('Бронь ' + id + ' не найдена.');
    const status = String(rows[i][6]).trim();
    if (status === CANCELED_STATUS) throw new Error('Эта бронь уже отменена.');
    if (status === RETURNED_STATUS) throw new Error('По этой брони устройство уже возвращено.');
    // Шлемы: C Статус, D Клиент, E Телефон, F Дата возврата, G ID брони
    const vr = ss.getSheetByName(SHEET_VR);
    const v = vr.getDataRange().getValues();
    const j = v.findIndex((r, n) => n > 0 && String(r[6]) === id);
    const vrStatus = j >= 0 ? String(v[j][2]).trim() : '';
    // Если в столбце «Статус» есть выпадающий список без такого значения — объясняем, что поправить
    const setVrStatus = val => {
      try { vr.getRange(j + 1, 3).setValue(val); }
      catch (e) { throw new Error('Таблица не приняла статус «' + val + '» в листе «Шлемы». Добавьте его в список статусов ' +
        'или поменяйте строку «Сайт: статус шлема при выдаче» в «Настройках».'); }
    };
    if (cmd === 'confirm') {
      if (status === CONFIRMED_STATUS || status === ISSUED_STATUS) return;
      bk.getRange(i + 1, 7).setValue(CONFIRMED_STATUS);
    } else if (cmd === 'issue') {
      if (status === ISSUED_STATUS) return;
      const rented = String(settings_()['Сайт: статус шлема при выдаче'] || 'В аренде').trim() || 'В аренде';
      if (j >= 0 && vrStatus === BOOKED) setVrStatus(rented);
      bk.getRange(i + 1, 7).setValue(ISSUED_STATUS);
    } else if (cmd === 'return') {
      if (status !== ISSUED_STATUS) throw new Error('Сначала отметьте «Выдан».');
      if (j >= 0) vr.getRange(j + 1, 3, 1, 5).setValues([[FREE, '', '', '', '']]);
      bk.getRange(i + 1, 7).setValue(RETURNED_STATUS);
    } else {
      if (status === ISSUED_STATUS) throw new Error('Устройство уже выдано — когда вернут, нажмите «Возвращён».');
      bk.getRange(i + 1, 7).setValue(CANCELED_STATUS);
      if (j >= 0 && vrStatus === BOOKED) vr.getRange(j + 1, 3, 1, 5).setValues([[FREE, '', '', '', '']]);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

/** Включена ли оплата наличными (строка «Сайт: оплата наличными» = да). */
function cashOn_(s) { return /^(да|yes|вкл|1|true)/i.test(String(s['Сайт: оплата наличными'] || '').trim()); }

/** Последние 10 цифр телефона — чтобы +7 999… и 8 999… считались одним номером. */
function phoneKey_(p) { return String(p || '').replace(/\D/g, '').slice(-10); }

/** Бронь: вызывается, когда клиент нажал «Я оплатил» или «Забронировать — оплачу наличными». */
function book(form) {
  const name = String(form.name || '').trim();
  const phone = String(form.phone || '').trim();
  const days = parseInt(form.days, 10);
  if (name.length < 2) throw new Error('Укажите Ф.И.О.');
  if (phone.replace(/\D/g, '').length < 10) throw new Error('Укажите телефон полностью.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^\d{2}:\d{2}$/.test(form.time)) throw new Error('Укажите дату и время.');
  if (!(days >= 1 && days <= 30)) throw new Error('Срок — от 1 до 30 суток.');
  const img = v => /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(v || ''));
  const photo = img(form.passport);   // главная страница
  const photo2 = img(form.passport2); // прописка
  if (!photo) throw new Error('Прикрепите фото главной страницы паспорта.');
  if (!photo2) throw new Error('Прикрепите фото страницы с пропиской.');

  const ss = ss_();
  const s = settings_();
  const cash = form.pay === 'cash';
  if (cash && !cashOn_(s)) throw new Error('Оплата наличными сейчас недоступна. Выберите оплату переводом.');
  const tz = String(s['Часовой пояс'] || 'Europe/Moscow');
  const start = Utilities.parseDate(form.date + ' ' + form.time, tz, 'yyyy-MM-dd HH:mm');
  const end = new Date(start.getTime() + days * 24 * 3600 * 1000);
  if (start.getTime() < Date.now() - 2 * 3600 * 1000) throw new Error('Дата начала уже прошла.');
  const sum = priceFor_(prices_(s, cat_(form.id)), days);
  const id = 'BR-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // двое не забронируют один шлем одновременно
  let vrName;
  try {
    const vr = ss.getSheetByName(SHEET_VR);
    const rows = vr.getDataRange().getValues();
    const i = rows.findIndex((r, n) => n > 0 && String(r[0]) === String(form.id));
    if (i < 0) throw new Error('Шлем не найден. Обновите страницу.');
    if (String(rows[i][2]).trim() !== FREE) throw new Error('Это устройство только что заняли. Выберите другое.');
    vrName = String(rows[i][1] || rows[i][0]);

    // Защита от спама для наличных: считаем брони «Наличные — подтвердить», которые вы ещё не обработали
    const bk = ss.getSheetByName(SHEET_BOOK);
    if (cash) {
      const openCash = bk.getDataRange().getValues().slice(1).filter(r => String(r[6]).trim() === CASH_STATUS);
      // 1) с одного номера — одна неподтверждённая бронь за наличные
      const mine = openCash.find(r => phoneKey_(r[2]) === phoneKey_(phone));
      if (mine) throw new Error('С этого номера уже есть бронь ' + mine[0] + ' с оплатой наличными. ' +
        'Дождитесь нашего звонка или выберите оплату переводом.');
      // 2) всего не больше N неподтверждённых — чтобы никто не занял все шлемы
      const maxCash = Number(s['Сайт: наличные — максимум неподтверждённых броней']) || 2;
      if (openCash.length >= maxCash)
        throw new Error('Сейчас бронь с оплатой наличными недоступна. Выберите оплату переводом или позвоните нам.');
    }

    // Фото паспорта — в папку паспортов на Диске (доступ только у владельца)
    const passportUrl = savePassport_(s, photo, id, name + ' главная');
    const passportUrl2 = savePassport_(s, photo2, id, name + ' прописка');

    // Шлемы: Статус, Клиент, Телефон, Дата возврата, ID брони
    vr.getRange(i + 1, 3, 1, 5).setValues([[BOOKED, safe_(name), safe_(phone), end, id]]);
    vr.getRange(i + 1, 6).setNumberFormat(DATE_FORMAT);

    bk.appendRow([id, safe_(name), safe_(phone), rows[i][0], start, end, cash ? CASH_STATUS : BOOKING_STATUS, '',
      cash ? 'Наличные' : 'Перевод']);
    const last = bk.getLastRow();
    bk.getRange(last, 5, 1, 2).setNumberFormat(DATE_FORMAT);
    // Две ссылки в одной ячейке: «Главная · Прописка»
    const t1 = 'Главная', t2 = 'Прописка', text = t1 + ' · ' + t2;
    bk.getRange(last, 8).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(text)
      .setLinkUrl(0, t1.length, passportUrl)
      .setLinkUrl(text.length - t2.length, text.length, passportUrl2).build());
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const fmt = d => Utilities.formatDate(d, tz, DATE_FORMAT);
  notify_(s, '🕶 Новая бронь с сайта ' + id + '\n' + vrName + ' (' + form.id + ')\n' + name + ', ' + phone +
    '\n' + fmt(start) + ' → ' + fmt(end) + ' (' + days + ' сут.)\nСумма: ' + sum + ' ₽' +
    (cash ? '\n💵 Наличными при получении — позвоните клиенту и подтвердите.' : ' — переводом, проверьте оплату.'));
  return { id: id, name: vrName, start: fmt(start), end: fmt(end), days: days, sum: sum };
}

/** Сохраняет фото паспорта в папку из настройки «Папка паспортов» и возвращает ссылку на файл. */
function savePassport_(s, photo, id, name) {
  const bytes = Utilities.base64Decode(photo[2]);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Фото слишком большое. Попробуйте другое.');
  const folderId = String(s['Папка паспортов'] || '').trim();
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const ext = photo[1] === 'image/png' ? '.png' : photo[1] === 'image/webp' ? '.webp' : '.jpg';
  const fileName = id + ' ' + name.replace(/[^0-9A-Za-zА-Яа-яЁё\- ]/g, '').slice(0, 40) + ext;
  return folder.createFile(Utilities.newBlob(bytes, photo[1], fileName)).getUrl();
}

/** Текст, начинающийся с = + - @, таблица считает формулой — делаем его обычным текстом. */
function safe_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }

/** Сообщение в Telegram. Можно несколько получателей: chat_id через запятую. */
function notify_(s, text) {
  try { tgSend_(s, text); } catch (e) { /* уведомление необязательно — бронь всё равно сохранена */ }
}

function tgSend_(s, text) {
  const token = String(s['Сайт: Telegram токен бота'] || '').trim();
  const chats = String(s['Сайт: Telegram chat_id'] || '').split(/[,;\s]+/).filter(Boolean);
  if (!token || !chats.length) throw new Error('Заполните в «Настройках» строки «Сайт: Telegram токен бота» и «Сайт: Telegram chat_id».');
  chats.forEach(chat => {
    const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage',
      { method: 'post', payload: { chat_id: chat, text: text }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) {
      let why = '';
      try { why = JSON.parse(r.getContentText()).description || ''; } catch (e) {}
      throw new Error('Telegram не принял сообщение для ' + chat + ': ' + why +
        (/chat not found/i.test(why) ? ' — сначала напишите своему боту любое сообщение (/start).' : '') +
        (/Unauthorized/i.test(why) || /^Not Found$/i.test(why) ? ' — проверьте токен бота.' : ''));
    }
  });
}

/** Запустите эту функцию в редакторе (▶ Выполнить), чтобы проверить уведомления: придёт тестовое сообщение. */
function testTelegram() {
  tgSend_(settings_(), '✅ WAY_VR: уведомления работают! Сюда будут приходить новые брони с сайта.');
}
