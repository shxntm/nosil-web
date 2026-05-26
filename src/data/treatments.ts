export const CATEGORIES = [
  { key: 'tone_laser', name: '톤 개선 레이저' },
  { key: 'fractional', name: '흉터/재생 레이저' },
  { key: 'hair_removal', name: '제모 레이저' },
  { key: 'vascular', name: '홍조 레이저' },
  { key: 'acne_laser', name: '여드름 레이저' },
  { key: 'genesis', name: '순한 톤/결 레이저' },
  { key: 'rf_lifting', name: '고주파 리프팅' },
  { key: 'inmode', name: '인모드' },
  { key: 'needle_rf', name: '미세바늘 고주파' },
  { key: 'hifu', name: '초음파 리프팅' },
  { key: 'microwave', name: '윤곽/지방 리프팅' },
  { key: 'hydra', name: '수분 스킨부스터' },
  { key: 'regen', name: '재생 스킨부스터' },
  { key: 'barrier', name: 'ECM 스킨부스터' },
  { key: 'collagen', name: '콜라겐 부스터' },
  { key: 'botox', name: '보톡스' },
  { key: 'filler', name: '필러' },
  { key: 'soothing', name: '진정/회복 관리' },
];

export type Treatment = {
  name: string;
  category: string;
  concerns: string[];
  interval: number;
  good: string[];
  avoid: string[];
  price: string;
  range: string;
  sessions: string;
  downtime: string;
  effect: string;
};

export const TREATMENTS: Treatment[] = [
  { name: '피코슈어 토닝', category: 'tone_laser', concerns: ['기미','잡티','색소침착','칙칙함','피부톤','피부결'], interval: 4, good: ['LDM','물광주사','리쥬란','진정관리'], avoid: ['프락셀','포텐자','강한 필링','레이저제모 직후'], price: '약 12만 원', range: '5만~25만 원', sessions: '5~10회 이상', downtime: '3일', effect: '색소, 잡티, 톤 개선' },
  { name: '피코플러스 토닝', category: 'tone_laser', concerns: ['기미','잡티','여드름 자국','피부톤','피부결','모공 보조'], interval: 4, good: ['LDM','리쥬란','물광주사','진정관리'], avoid: ['프락셀','포텐자','강한 필링','혈관레이저 직후'], price: '약 15만 원', range: '8만~30만 원', sessions: '5~10회 이상', downtime: '3일', effect: '깊은 색소, 톤, 결' },
  { name: '일반 프락셀', category: 'fractional', concerns: ['여드름 흉터','모공','요철','피부결','잔흉터'], interval: 6, good: ['LDM','리쥬란','ECM스킨부스터','재생관리'], avoid: ['포텐자','피코레이저','레이저제모','강한 필링'], price: '약 15만 원', range: '5만~30만 원', sessions: '3~5회', downtime: '10일', effect: '흉터, 모공, 피부결' },
  { name: '피코슈어 프락셀', category: 'fractional', concerns: ['모공','피부결','미세주름','여드름 흉터','톤'], interval: 4, good: ['LDM','리쥬란','ECM스킨부스터','재생관리'], avoid: ['포텐자','니들RF','레이저제모','강한 필링'], price: '약 25만 원', range: '15만~40만 원', sessions: '3~5회', downtime: '7일', effect: '모공, 결, 잔흉터' },
  { name: '피코플러스 프락셀', category: 'fractional', concerns: ['모공','피부결','흉터','탄력 보조'], interval: 4, good: ['LDM','리쥬란','ECM스킨부스터'], avoid: ['포텐자','니들RF','레이저제모'], price: '약 25만 원', range: '15만~40만 원', sessions: '3~5회', downtime: '7일', effect: '깊은 결, 모공, 잔흉터' },
  { name: '아포지플러스 제모', category: 'hair_removal', concerns: ['제모','털 감소','피부결 보조'], interval: 6, good: ['LDM','진정관리'], avoid: ['포텐자','프락셀','피코프락셀','강한 필링'], price: '부위별 다름', range: '5만~30만 원', sessions: '5~10회 이상', downtime: '3일', effect: '제모, 털 감소' },
  { name: '엘리트 제모', category: 'hair_removal', concerns: ['제모','털 감소'], interval: 6, good: ['LDM','진정관리'], avoid: ['포텐자','프락셀','니들RF'], price: '부위별 다름', range: '5만~30만 원', sessions: '5~10회 이상', downtime: '3일', effect: '제모' },
  { name: '젠틀맥스 프로', category: 'hair_removal', concerns: ['제모','털 감소'], interval: 6, good: ['LDM','진정관리'], avoid: ['프락셀','피코프락셀','포텐자'], price: '부위별 다름', range: '5만~40만 원', sessions: '5~10회 이상', downtime: '3일', effect: '제모, 털 감소' },
  { name: '시너지 MPX', category: 'vascular', concerns: ['홍조','붉은 자국','혈관','붓기'], interval: 4, good: ['LDM','리쥬란','진정관리'], avoid: ['프락셀','피코프락셀','강한 필링','제모레이저 직후'], price: '약 20만 원', range: '10만~35만 원', sessions: '3~5회 이상', downtime: '7일', effect: '홍조, 붉은 자국' },
  { name: '카프리 레이저', category: 'acne_laser', concerns: ['화농성여드름','피지','염증'], interval: 2, good: ['LDM','스킨보톡스','진정관리'], avoid: ['프락셀','포텐자','강한 필링'], price: '약 15만 원', range: '8만~25만 원', sessions: '3~5회 이상', downtime: '3일', effect: '여드름, 피지 조절' },
  { name: '시너지 제네시스', category: 'genesis', concerns: ['홍조','여드름','피부결','탄력'], interval: 2, good: ['LDM','리쥬란','물광주사'], avoid: ['프락셀','포텐자','강한 필링'], price: '약 10만 원', range: '6만~18만 원', sessions: '5회 이상', downtime: '2일', effect: '홍조, 결, 가벼운 탄력' },
  { name: '포토나 제네시스', category: 'genesis', concerns: ['피부결','탄력','홍조 보조'], interval: 2, good: ['LDM','리쥬란'], avoid: ['프락셀','포텐자'], price: '약 10만 원', range: '6만~18만 원', sessions: '5회 이상', downtime: '2일', effect: '결, 탄력' },
  { name: '레블라이트 제네시스', category: 'genesis', concerns: ['피부결','탄력','톤 보조'], interval: 2, good: ['LDM','물광주사'], avoid: ['프락셀','강한 필링'], price: '약 10만 원', range: '6만~18만 원', sessions: '5회 이상', downtime: '2일', effect: '결, 탄력, 톤' },
  { name: 'LDM', category: 'soothing', concerns: ['진정','보습','장벽','붓기'], interval: 1, good: ['피코토닝','프락셀','포텐자','리쥬란','혈관레이저'], avoid: ['보톡스 직후 강한 압박'], price: '약 8만 원', range: '5만~15만 원', sessions: '반복 가능', downtime: '0일', effect: '진정, 보습, 장벽' },
  { name: '포텐자', category: 'needle_rf', concerns: ['모공','흉터','탄력','피부결'], interval: 6, good: ['쥬베룩','리쥬란','LDM','ECM스킨부스터'], avoid: ['프락셀','피코프락셀','제모레이저','강한 필링'], price: '약 25만 원', range: '12만~40만 원', sessions: '3회 이상', downtime: '5일', effect: '모공, 흉터, 탄력, 결' },
  { name: '인피니', category: 'needle_rf', concerns: ['흉터','모공','탄력','잔주름'], interval: 6, good: ['쥬베룩','LDM','리쥬란'], avoid: ['제모레이저','프락셀','강한 필링'], price: '약 25만 원', range: '15만~40만 원', sessions: '3회 이상', downtime: '7일', effect: '흉터, 모공, 탄력' },
  { name: '시크릿RF', category: 'needle_rf', concerns: ['모공','흉터','피부결','탄력'], interval: 6, good: ['쥬베룩','LDM'], avoid: ['프락셀','제모레이저'], price: '약 25만 원', range: '15만~40만 원', sessions: '3회 이상', downtime: '5일', effect: '모공, 흉터, 결' },
  { name: '인트라셀', category: 'needle_rf', concerns: ['여드름 흉터','모공','탄력'], interval: 6, good: ['LDM','리쥬란','ECM스킨부스터'], avoid: ['제모레이저','프락셀'], price: '약 25만 원', range: '15만~40만 원', sessions: '3회 이상', downtime: '7일', effect: '흉터, 모공, 탄력' },
  { name: '써마지', category: 'rf_lifting', concerns: ['탄력','잔주름','피부결','타이트닝'], interval: 52, good: ['울쎄라','리쥬란','스킨보톡스'], avoid: ['필러','쥬베룩 볼륨','인모드 직후'], price: '약 180만 원', range: '100만~250만 원', sessions: '1회 후 유지', downtime: '3일', effect: '탄력, 잔주름, 타이트닝' },
  { name: '올리지오', category: 'rf_lifting', concerns: ['탄력','잔주름','피부결'], interval: 24, good: ['리쥬란','스킨보톡스','LDM'], avoid: ['필러 직후','강한 염증 피부'], price: '약 100만 원', range: '60만~150만 원', sessions: '1~3회', downtime: '2일', effect: '탄력, 잔주름, 결' },
  { name: '볼뉴머', category: 'rf_lifting', concerns: ['탄력','타이트닝','피부결'], interval: 24, good: ['리쥬란','스킨보톡스'], avoid: ['필러','쥬베룩 볼륨 직후'], price: '약 120만 원', range: '70만~180만 원', sessions: '1~3회', downtime: '2일', effect: '탄력, 타이트닝' },
  { name: '인모드 FX', category: 'inmode', concerns: ['이중턱','턱선','지방감','탄력'], interval: 4, good: ['온다리프팅','LDM','고주파관리'], avoid: ['울쎄라 과다','필러','쥬베룩 볼륨 직후'], price: '약 18만 원', range: '10만~35만 원', sessions: '3회 이상', downtime: '7일', effect: '지방감, 턱선, 탄력' },
  { name: '인모드 Forma', category: 'inmode', concerns: ['탄력','피부결','타이트닝'], interval: 4, good: ['인모드 FX','LDM','리쥬란'], avoid: ['필러 직후','강한 열감 피부'], price: '약 15만 원', range: '8만~25만 원', sessions: '3회 이상', downtime: '2일', effect: '탄력, 결, 타이트닝' },
  { name: '울쎄라', category: 'hifu', concerns: ['처짐','턱선','리프팅','탄력'], interval: 52, good: ['써마지','리쥬란','쥬베룩 볼륨'], avoid: ['인모드 과다','온다 과다','지방 적은 얼굴'], price: '약 110만 원', range: '80만~160만 원', sessions: '1회 후 유지', downtime: '7일', effect: '리프팅, 턱선' },
  { name: '슈링크', category: 'hifu', concerns: ['리프팅','턱선','탄력'], interval: 24, good: ['리쥬란','LDM'], avoid: ['인모드 과다','필러 직후'], price: '약 50만 원', range: '30만~100만 원', sessions: '1~3회', downtime: '3일', effect: '리프팅, 턱선, 탄력' },
  { name: '더블로', category: 'hifu', concerns: ['리프팅','탄력','턱선'], interval: 24, good: ['리쥬란','쥬베룩 볼륨'], avoid: ['필러 직후','지방 적은 얼굴'], price: '약 50만 원', range: '30만~100만 원', sessions: '1~3회', downtime: '3일', effect: '리프팅, 탄력' },
  { name: '올타이트', category: 'rf_lifting', concerns: ['처짐','이중턱','턱선','탄력'], interval: 24, good: ['쥬베룩 볼륨','리쥬란','써마지'], avoid: ['인모드 과다','온다 과다','지방 적은 얼굴'], price: '약 70만 원', range: '20만~100만 원', sessions: '1~3회', downtime: '3일', effect: '리프팅, 탄력' },
  { name: '온다리프팅', category: 'microwave', concerns: ['이중턱','지방감','턱선','타이트닝'], interval: 4, good: ['인모드','LDM','고주파관리'], avoid: ['울쎄라 과다','필러 직후','쥬베룩 볼륨 직후'], price: '약 25만 원', range: '6만~60만 원', sessions: '3회 이상', downtime: '2일', effect: '지방감, 턱선, 타이트닝' },
  { name: '물광주사', category: 'hydra', concerns: ['수분감','광채','잔주름','피부결'], interval: 4, good: ['리쥬란','스킨보톡스','LDM'], avoid: ['프락셀 직후','강한 필링 직후'], price: '약 25만 원', range: '10만~45만 원', sessions: '3회 이상', downtime: '3일', effect: '수분, 광채, 잔주름' },
  { name: '스킨바이브', category: 'hydra', concerns: ['수분','피부결','광채'], interval: 4, good: ['스킨보톡스','LDM'], avoid: ['고강도 레이저 직후'], price: '약 40만 원', range: '25만~60만 원', sessions: '1~2회', downtime: '3일', effect: '수분, 결, 광채' },
  { name: '리쥬란', category: 'regen', concerns: ['재생','피부결','속건조','잔주름'], interval: 4, good: ['LDM','물광주사','포텐자','프락셀'], avoid: ['레이저제모 직후','강한 필링'], price: '약 30만 원', range: '20만~40만 원', sessions: '3회 후 유지', downtime: '5일', effect: '재생, 결, 잔주름' },
  { name: '리쥬란 I', category: 'regen', concerns: ['눈가 잔주름','건조','얇은 피부'], interval: 4, good: ['LDM','스킨보톡스 소량'], avoid: ['눈가 필러 직후','강한 고주파'], price: '약 35만 원', range: '25만~50만 원', sessions: '3회 후 유지', downtime: '5일', effect: '눈가 재생, 결' },
  { name: '리쥬란 S', category: 'regen', concerns: ['흉터','국소 재생','피부결'], interval: 4, good: ['프락셀','포텐자','LDM'], avoid: ['레이저제모','강한 필링'], price: '약 30만 원', range: '20만~50만 원', sessions: '3회 이상', downtime: '5일', effect: '흉터, 국소 재생' },
  { name: '리쥬란 HB', category: 'regen', concerns: ['재생','수분','피부결'], interval: 4, good: ['물광주사','LDM'], avoid: ['강한 레이저 직후'], price: '약 35만 원', range: '25만~50만 원', sessions: '3회 후 유지', downtime: '3일', effect: '재생, 수분, 결' },
  { name: '엘라비에 리투오', category: 'barrier', concerns: ['피부 밀도','탄력','모공','잔주름','피부결','속건조'], interval: 4, good: ['LDM','포텐자','피코토닝','리쥬란','물광주사'], avoid: ['강한 고주파 직후','인모드 직후','필러 직후','강한 필링'], price: '약 35만 원', range: '25만~55만 원', sessions: '3회 권장 후 유지', downtime: '5일', effect: '밀도, 탄력, 모공, 결' },
  { name: '셀르디엠', category: 'barrier', concerns: ['피부결','모공','잔주름','피부 밀도','장벽 회복','탄력'], interval: 4, good: ['LDM','피코토닝','리쥬란','물광주사','스킨보톡스'], avoid: ['프락셀 직후','포텐자 직후','강한 필링','필러 직후'], price: '약 35만 원', range: '25만~55만 원', sessions: '3~4회 권장 후 유지', downtime: '2일', effect: '결, 모공, 밀도, 장벽' },
  { name: '쥬브아셀 3%', category: 'barrier', concerns: ['피부결','모공','광채','얇은 피부','잔주름','재생'], interval: 4, good: ['LDM','물광주사','스킨보톡스','피코토닝'], avoid: ['인모드 직후','강한 고주파 직후','강한 필링'], price: '약 30만 원', range: '20만~45만 원', sessions: '3회 권장 후 유지', downtime: '7일', effect: '결, 광채, 재생' },
  { name: '쥬브아셀 8%', category: 'barrier', concerns: ['탄력','볼륨 보완','꺼짐','피부 밀도','잔주름'], interval: 4, good: ['울쎄라','올타이트','써마지','LDM'], avoid: ['인모드','고주파','필러 직후','강한 마사지'], price: '약 45만 원', range: '35만~70만 원', sessions: '1~3회', downtime: '7일', effect: '탄력, 볼륨 보완, 밀도' },
  { name: '쥬베룩', category: 'collagen', concerns: ['모공','흉터','탄력','피부결'], interval: 6, good: ['포텐자','니들RF','LDM'], avoid: ['강한 고주파 직후','무분별한 필러 혼합'], price: '약 35만 원', range: '20만~55만 원', sessions: '3회 권장', downtime: '5일', effect: '모공, 흉터, 탄력' },
  { name: '쥬베룩 볼륨', category: 'collagen', concerns: ['볼륨','꺼짐','탄력'], interval: 8, good: ['울쎄라','올타이트','써마지'], avoid: ['인모드','고주파','필러 직후'], price: '약 50만 원', range: '30만~80만 원', sessions: '1~3회', downtime: '7일', effect: '볼륨, 꺼짐 보완' },
  { name: '스컬트라', category: 'collagen', concerns: ['볼륨','탄력','꺼짐'], interval: 6, good: ['써마지','HIFU'], avoid: ['고강도 RF 직후'], price: '약 70만 원', range: '50만~100만 원', sessions: '2~3회', downtime: '7일', effect: '볼륨, 탄력' },
  { name: '이마 보톡스', category: 'botox', concerns: ['이마주름'], interval: 24, good: ['스킨보톡스','리쥬란'], avoid: ['강한 마사지','고주파 직후'], price: '약 10만 원', range: '5만~25만 원', sessions: '1회 후 유지', downtime: '2일', effect: '이마 가로주름' },
  { name: '미간 보톡스', category: 'botox', concerns: ['미간주름'], interval: 24, good: ['스킨보톡스'], avoid: ['강한 마사지'], price: '약 8만 원', range: '4만~20만 원', sessions: '1회 후 유지', downtime: '2일', effect: '미간 주름' },
  { name: '눈가 보톡스', category: 'botox', concerns: ['눈가주름'], interval: 24, good: ['리쥬란 I'], avoid: ['눈가 필러 직후'], price: '약 10만 원', range: '5만~25만 원', sessions: '1회 후 유지', downtime: '2일', effect: '눈가 주름' },
  { name: '브로우 리프트 보톡스', category: 'botox', concerns: ['눈썹 라인','눈매 보조'], interval: 24, good: ['리쥬란 I'], avoid: ['강한 마사지'], price: '약 12만 원', range: '6만~25만 원', sessions: '1회 후 유지', downtime: '2일', effect: '눈매, 눈썹 라인' },
  { name: '바니라인 보톡스', category: 'botox', concerns: ['콧등 주름'], interval: 24, good: ['스킨보톡스'], avoid: ['코 필러 직후'], price: '약 10만 원', range: '5만~20만 원', sessions: '1회 후 유지', downtime: '2일', effect: '콧등 주름' },
  { name: '입가 잔주름 보톡스', category: 'botox', concerns: ['입가 세로주름'], interval: 24, good: ['입술 필러'], avoid: ['입술 필러 직후'], price: '약 10만 원', range: '5만~20만 원', sessions: '1회 후 유지', downtime: '2일', effect: '입가 주름' },
  { name: '턱끝 보톡스', category: 'botox', concerns: ['울퉁불퉁한 턱끝'], interval: 24, good: ['턱필러'], avoid: ['강한 마사지'], price: '약 8만 원', range: '4만~18만 원', sessions: '1회 후 유지', downtime: '2일', effect: '턱끝 매끈함' },
  { name: '목밴드 보톡스', category: 'botox', concerns: ['목 세로 밴드'], interval: 24, good: ['리쥬란','스킨보톡스'], avoid: ['강한 마사지'], price: '약 25만 원', range: '15만~50만 원', sessions: '1회 후 유지', downtime: '2일', effect: '목 라인' },
  { name: '사각턱 보톡스', category: 'botox', concerns: ['턱근육','얼굴형'], interval: 24, good: ['인모드 FX','울쎄라'], avoid: ['턱 필러 직후'], price: '약 15만 원', range: '8만~30만 원', sessions: '1회 후 유지', downtime: '2일', effect: '턱 라인, 얼굴형' },
  { name: '스킨보톡스', category: 'botox', concerns: ['잔주름','모공','피지','피부결'], interval: 12, good: ['물광주사','리쥬란','고주파'], avoid: ['강한 마사지','LDM 고압 관리 직후'], price: '약 18만 원', range: '10만~35만 원', sessions: '1회 후 유지', downtime: '2일', effect: '잔주름, 모공, 피지, 결' },
  { name: '팔자 필러', category: 'filler', concerns: ['팔자주름','볼륨'], interval: 52, good: ['보톡스','리쥬란'], avoid: ['인모드','써마지','울쎄라 직후'], price: '약 50만 원', range: '30만~80만 원', sessions: '필요 시', downtime: '7일', effect: '팔자 보완' },
  { name: '마리오넷 필러', category: 'filler', concerns: ['입꼬리 아래 주름'], interval: 52, good: ['보톡스'], avoid: ['강한 마사지'], price: '약 50만 원', range: '30만~80만 원', sessions: '필요 시', downtime: '7일', effect: '입꼬리 라인' },
  { name: '입술 필러', category: 'filler', concerns: ['입술볼륨','라인'], interval: 52, good: ['입술 보톡스 소량'], avoid: ['강한 마사지'], price: '약 50만 원', range: '30만~80만 원', sessions: '필요 시', downtime: '7일', effect: '입술 볼륨' },
  { name: '눈밑 필러', category: 'filler', concerns: ['눈밑꺼짐','다크서클 보조'], interval: 52, good: ['리쥬란 I'], avoid: ['고주파','HIFU 직후'], price: '약 50만 원', range: '30만~90만 원', sessions: '필요 시', downtime: '7일', effect: '눈밑 보완' },
  { name: '볼/관자 필러', category: 'filler', concerns: ['꺼짐','볼륨','얼굴라인'], interval: 52, good: ['리쥬란','보톡스'], avoid: ['인모드','써마지','울쎄라 직후'], price: '약 60만 원', range: '40만~120만 원', sessions: '필요 시', downtime: '7일', effect: '꺼짐 보완, 라인' },
  { name: '턱라인/턱끝 필러', category: 'filler', concerns: ['턱라인','턱끝 보완'], interval: 52, good: ['사각턱 보톡스'], avoid: ['인모드','HIFU 직후'], price: '약 60만 원', range: '40만~100만 원', sessions: '필요 시', downtime: '7일', effect: '턱라인 보완' },
  { name: '코 필러', category: 'filler', concerns: ['콧대','코끝 라인'], interval: 52, good: ['보톡스 일부'], avoid: ['고주파','HIFU','마사지'], price: '약 60만 원', range: '40만~120만 원', sessions: '필요 시', downtime: '7일', effect: '코 라인' },
];

export function getCategoryName(key: string): string {
  return CATEGORIES.find(c => c.key === key)?.name ?? key;
}
