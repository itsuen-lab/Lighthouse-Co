export interface ArtworkEntry {
  id?: string;
  type?: string; // 종류: 메인/오리지널 포스터, 티저 포스터, 스페셜 아트 포스터, 해외/국제판 포스터, 캐릭터 포스터, 스틸컷 / 비주얼, 직접 입력
  imageUrl: string;
  title?: string; // 아트워크 상세 명칭/설명
  caption?: string;
  designer?: string; // 디자이너 / 디자인 스튜디오 (Designed by)
  showInMain?: boolean; // 메인 화면 아트워크 슬라이더 노출 여부 (기본값 true)
}

export function getArtworkImageUrl(item: string | ArtworkEntry | undefined | null): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return item.imageUrl ? item.imageUrl.trim() : "";
}

export function getArtworkType(item: string | ArtworkEntry | undefined | null): string {
  if (!item) return "아트워크";
  if (typeof item === "string") return "메인/오리지널 포스터";
  return item.type?.trim() || "메인/오리지널 포스터";
}

export function getArtworkTitle(item: string | ArtworkEntry | undefined | null): string {
  if (!item || typeof item === "string") return "";
  return item.title?.trim() || "";
}

export interface Film {
  id: string;
  title: string;
  titleKo: string;
  release: string;
  director: string;
  year: string;
  heroImage: string;
  posterImage: string;
  summary: string;
  summaryKo?: string;
  cast?: string;
  country?: string;
  runtime?: string;
  youtubeUrl?: string;
  bookingButtonVisible?: boolean;
  bookingButtonText?: string;
  bookingButtonUrl?: string;
  artworkDesigner?: string; // 기본 대표 아트워크 디자이너 (Designed by)
  artworks?: (string | ArtworkEntry)[];
  showInMainArtworks?: boolean;
  mainArtworkImage?: string;
}

export interface PromoCard {
  id: string;
  badgeTopLeft?: string;
  badgeTopRight?: string;
  kicker?: string;
  titleLines: string[];
  subtitle: string;
  ctaText?: string;
  url: string;
  image: string;
  visible?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  url: string;
  isExternal?: boolean;
  targetBlank?: boolean;
  visible?: boolean;
}

export interface ContactInfo {
  email: string;
  youtubeUrl: string;
  instagramUrl: string;
  xUrl: string;
  inquiryEndpoint: string;
}

export interface DirectorNote {
  id: string;
  quote: string; // 인용구/명대사 문구
  photo?: string; // 배경 사진 (구글 드라이브 및 이미지 URL)
  directorName?: string; // 감독 또는 인물명 (선택)
  filmTitle?: string; // 관련 영화 제목 (선택)
  visible?: boolean; // 메인 화면 노출 여부 (기본 true)
}

export interface JournalPost {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  category?: string; // ESSAY, NEWS, CRITIQUE, NOTE, INTERVIEW, etc.
  imageUrl?: string;
  content: string; // Multiline text / essay content
  author?: string;
  visible?: boolean;
  visibleOnMain?: boolean; // 메인 화면 발행/노출 여부 (기본 true)
  visibleOnBoard?: boolean; // 게시판 페이지 발행/노출 여부 (기본 true)
}

export interface SiteContent {
  navItems?: NavItem[];
  featured: string[];
  films: Film[];
  director: {
    photo: string;
    quote: string;
    name?: string;
  };
  directorNotes?: DirectorNote[];
  directorNotesVisible?: boolean;
  journalPosts?: JournalPost[];
  journalVisible?: boolean;
  promo?: {
    image: string;
    titleLines: string[];
    subtitle: string;
    url: string;
  };
  promos: PromoCard[];
  promosVisible?: boolean;
  contact?: ContactInfo;
  artworksVisible?: boolean;
  mainArtworkIds?: string[];
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "nav-programs", label: "PROGRAMS", url: "#programs", isExternal: false, targetBlank: false, visible: true },
  { id: "nav-journal", label: "JOURNAL", url: "#journal", isExternal: false, targetBlank: false, visible: true },
  { id: "nav-about", label: "ABOUT", url: "#about", isExternal: false, targetBlank: false, visible: true },
  { id: "nav-contact", label: "CONTACT", url: "#contact", isExternal: false, targetBlank: false, visible: true },
];

export const INITIAL_CONTENT: SiteContent = {
  "navItems": [
    {
      "id": "nav-programs",
      "visible": true,
      "isExternal": false,
      "url": "#programs",
      "label": "PROGRAMS",
      "targetBlank": false
    },
    {
      "id": "nav-journal",
      "visible": true,
      "isExternal": false,
      "url": "#journal",
      "label": "JOURNAL",
      "targetBlank": false
    },
    {
      "url": "#about",
      "visible": true,
      "targetBlank": false,
      "label": "ABOUT",
      "id": "nav-about",
      "isExternal": false
    },
    {
      "id": "nav-contact",
      "isExternal": false,
      "targetBlank": false,
      "label": "CONTACT",
      "url": "#contact",
      "visible": true
    }
  ],
  "featured": [
    "remake",
    "umbrella",
    "celine",
    "wicker",
    "contempt",
    "eureka",
    "film-mvwdwa39"
  ],
  "films": [
    {
      "id": "umbrella",
      "runtime": "91 min",
      "director": "Jacques Demy",
      "country": "France",
      "posterImage": "",
      "release": "Coming Soon",
      "bookingButtonVisible": false,
      "titleKo": "쉘부르의 우산",
      "year": "1964",
      "showInMainArtworks": false,
      "summary": "",
      "title": "The Umbrellas of Cherbourg",
      "summaryKo": "프랑스 노르망디 해협의 작은 항구도시 쉘부르, 우산가게 일을 돕는 ‘쥬느비에브’와 자동차 수리공 ‘기’는 사랑에 빠진다",
      "youtubeUrl": "",
      "heroImage": "https://drive.google.com/thumbnail?id=1jhnAZUeGoWayGiVtCGtTBT-fwPnIUOeZ&sz=w1920"
    },
    {
      "summary": "",
      "titleKo": "리메이크",
      "summaryKo": "로스 맥켈위는 세상을 떠난 아들 에이드리언의 일생을 담은 촬영본 앞에서 시간과 기억을 재구성한다.\n",
      "showInMainArtworks": false,
      "heroImage": "https://drive.google.com/thumbnail?id=1HdHZ-uFpA7weB2SiSLXwXjVBZ7cBY_fU&sz=w1920",
      "bookingButtonVisible": false,
      "director": "Ross McElwee",
      "year": "2025",
      "title": "Remake",
      "posterImage": "",
      "id": "remake",
      "release": "Coming Soon",
      "runtime": "98 min",
      "country": "USA"
    },
    {
      "showInMainArtworks": false,
      "id": "sherman",
      "titleKo": "셔먼의 행진",
      "director": "Ross McElwee",
      "bookingButtonVisible": false,
      "summary": "",
      "country": "USA",
      "runtime": "157 min",
      "release": "",
      "posterImage": "",
      "heroImage": "https://drive.google.com/thumbnail?id=1a9O_PuvRj64-yvoCuCb0qwWI-sahvy_K&sz=w1920",
      "year": "1986",
      "summaryKo": "남북전쟁 셔먼 장군의 진군로를 따라가며 사랑과 고독, 영화와 인생을 유쾌하고 솔직하게 기록한 다큐멘터리 기념비.",
      "title": "Sherman's March"
    },
    {
      "posterImage": "",
      "youtubeUrl": "",
      "bookingButtonVisible": false,
      "heroImage": "https://drive.google.com/thumbnail?id=1kSYM3JrlcuDVbroRgjKETa9e0-PT1QTh&sz=w1920",
      "summary": "",
      "summaryKo": "거대한 성 안에서 남녀가 서로 다른 과거의 기억을 떠올린다.",
      "titleKo": "지난 해 마리앙바드에서",
      "showInMainArtworks": false,
      "release": "",
      "country": "France",
      "runtime": "94 min",
      "title": "Last Year At Marienbad",
      "id": "film-mvwdwa39",
      "year": "1961",
      "director": "Alain Resnais"
    },
    {
      "summary": "",
      "artworkDesigner": "Ozmo",
      "titleKo": "경멸",
      "youtubeUrl": "https://youtu.be/BRo3oawx-iU?si=7ZzJzFWpYusFJflo",
      "posterImage": "https://drive.google.com/thumbnail?id=1QxnMm5awtnSqQgeW-JzLJPMB9h6JQnxG&sz=w1920",
      "summaryKo": "지중해 태양과 카프리섬의 바다. 극작가 폴은 영화 '오디세이'의 대본 일을 맡으며 자신의 아름다운 아내 카미유를 영화 제작자에게 소개한다.",
      "year": "1963",
      "heroImage": "https://drive.google.com/thumbnail?id=1vnFDhikPyzkdXwK-vCPQLvfVFpdlRRpO&sz=w1920",
      "title": "Contempt",
      "mainArtworkImage": "https://drive.google.com/thumbnail?id=18W3HeS0sR5HP_Fd-FZO-yZWYVuYYwyNQ&sz=w1920",
      "showInMainArtworks": false,
      "artworks": [
        {
          "id": "art-1793436666108-cvh6",
          "title": "",
          "caption": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=18W3HeS0sR5HP_Fd-FZO-yZWYVuYYwyNQ&sz=w1920",
          "type": "아트 포스터",
          "showInMain": true,
          "designer": "Ozmo"
        },
        {
          "title": "",
          "caption": "",
          "type": "아트 포스터",
          "imageUrl": "https://drive.google.com/thumbnail?id=1NEXI42YEnYVXdeZDY2GLSeCG_DTR3X0h&sz=w1920",
          "id": "art-1793436808397-fpfd",
          "showInMain": true,
          "designer": "Ozmo"
        },
        {
          "showInMain": true,
          "caption": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=1LxPthNzwK04TJ8Snw74DeJ7qz62mikC8&sz=w1920",
          "id": "art-1793445304439-vdb8",
          "type": "메인/오리지널 포스터",
          "title": "",
          "designer": "Ozmo"
        }
      ],
      "director": "Jean-Luc Godard",
      "release": "2026.07.15",
      "country": "France / Italy",
      "id": "contempt",
      "runtime": "103 min"
    },
    {
      "posterImage": "",
      "titleKo": "쳐다보지 마라",
      "youtubeUrl": "",
      "summary": "",
      "id": "film-mvwdrkd8",
      "year": "1973",
      "title": "Don't Look Now",
      "director": "Nicolas Roeg",
      "bookingButtonVisible": false,
      "release": "",
      "country": "United Kingdom",
      "showInMainArtworks": false,
      "runtime": "110 min",
      "summaryKo": "어린 딸을 잃은 부부가 겨울의 베니스에 도착한다.\n그곳에서 죽은 딸의 영혼을 본다는 미스터리한 자매를 마주한다.",
      "heroImage": "https://drive.google.com/thumbnail?id=1CZKTE4UhveWf7Txf1TInB17Ikdnk50vR&sz=w1920"
    },
    {
      "heroImage": "https://drive.google.com/thumbnail?id=18C4fQDn5bs8n6BMzgRxSGyutakJXUvUA&sz=w1920",
      "summaryKo": "실종된 소녀 '로완 모리슨'을 찾기 위해 스코틀랜드의 외딴 섬 '서머아일'을 찾은 경찰 하위. 마을을 지배하는 기이한 종교 의식과 마주한 그는 주민들이 감추고 있는 거대한 비밀에 하나씩 다가간다.",
      "artworkDesigner": "Ozmo",
      "id": "wicker",
      "year": "1973",
      "youtubeUrl": "https://youtu.be/NqNH2kEGjGA?si=QlfpN3QRacOvZU0F",
      "titleKo": "위커 맨: 파이널 컷",
      "director": "Robin Hardy",
      "summary": "",
      "artworks": [
        {
          "imageUrl": "https://drive.google.com/thumbnail?id=10UJWZjOG-BAMTSiRhSld9HViYijn0OHL&sz=w1920",
          "designer": "",
          "showInMain": true,
          "caption": "",
          "type": "메인/오리지널 포스터",
          "id": "art-1793446180558-dqap",
          "title": ""
        },
        {
          "designer": "Ozmo",
          "type": "일러스트 포스터",
          "imageUrl": "https://drive.google.com/thumbnail?id=1zCht2tQkfnfxDaR9ROdTZcTuvg09FbuD&sz=w1920",
          "showInMain": true,
          "title": "",
          "id": "art-1793446194539-rtnr",
          "caption": ""
        }
      ],
      "release": "",
      "country": "United Kingdom",
      "runtime": "95 min",
      "title": "The Wicker Man: Final Cut",
      "posterImage": "https://drive.google.com/thumbnail?id=1enKyHHqhiUrw7IGMrxm0-a4FhD7kfJA8&sz=w1920",
      "showInMainArtworks": false
    },
    {
      "posterImage": "https://drive.google.com/thumbnail?id=1P7QWo8HfdhudStB_2xBOgnLT-ihDVS2Q&sz=w1920",
      "bookingButtonVisible": false,
      "release": "2026.09.30",
      "country": "France",
      "runtime": "193 min",
      "youtubeUrl": "https://youtu.be/0Pjds-G8NhU?si=V54TevRO7-T3Ckcw",
      "director": "Jacques Rivette",
      "artworks": [
        {
          "type": "메인/오리지널 포스터",
          "caption": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=1218ty5bwdCWTRseR-AeiIxIXdjfW9udP&sz=w1920",
          "title": "",
          "id": "art-1793440037531-ywgv",
          "designer": "Ozmo",
          "showInMain": true
        }
      ],
      "titleKo": "셀린느와 줄리 배 타러 가다",
      "id": "celine",
      "title": "Céline and Julie Go Boating",
      "summary": "",
      "summaryKo": "도서관 사서 줄리는 공원 벤치에서 책을 읽다가 마술사 셀린느를 우연히 만난다.\n기억을 부르는 마법 사탕을 맛보게 된 두 사람은 비밀을 간직한 한 저택의 알 수 없는 환영 속으로 빠져든다.",
      "showInMainArtworks": false,
      "heroImage": "https://drive.google.com/thumbnail?id=1Eqmsv8HvpgnuApvS3-5ul4x44yBJ_I49&sz=w1920",
      "year": "1974"
    },
    {
      "youtubeUrl": "",
      "showInMainArtworks": false,
      "id": "film-mvwd3hld",
      "summaryKo": "프랑스 스트라스부르의 한 도시에 돌아온 남자는\n6년 전 만난 ‘실비아’라는 이름의 여성을 찾는다.",
      "heroImage": "https://drive.google.com/thumbnail?id=1Yi75kJTiePf68Y9LqHO8TKRLRaDejCEL&sz=w1920",
      "title": "In the City of Sylvia",
      "country": "Spain",
      "runtime": "85 min",
      "year": "2007",
      "release": "",
      "bookingButtonVisible": false,
      "director": "Jose Luis Guerin",
      "summary": "",
      "titleKo": "실비아의 도시에서",
      "posterImage": ""
    },
    {
      "bookingButtonVisible": false,
      "id": "film-mvwdp0rc",
      "titleKo": "",
      "heroImage": "https://drive.google.com/thumbnail?id=1Z6_Gdqpc2I4t7EE008bP0SaBKZ51OBCa&sz=w1920",
      "summaryKo": "",
      "summary": "",
      "country": "Korea",
      "youtubeUrl": "",
      "runtime": "109 min",
      "release": "",
      "showInMainArtworks": false,
      "posterImage": "",
      "year": "2007",
      "title": "M",
      "director": "Lee Myung-se"
    },
    {
      "id": "eureka",
      "runtime": "217 min",
      "bookingButtonVisible": false,
      "country": "Japan",
      "posterImage": "https://drive.google.com/thumbnail?id=1Nc8OqleYK0kKQ29oKXmT7Ri30rJqRtni&sz=w1920",
      "release": "2026.05.27",
      "showInMainArtworks": false,
      "title": "Eureka",
      "artworks": [
        {
          "type": "메인/오리지널 포스터",
          "title": "",
                    "id": "art-1793420431889-t8mf",
          "caption": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=12_pMNe30v5YI-bYEtCNfn6LM3fH4Br3T&sz=w1920",
          "showInMain": false
        },
        {
                    "title": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=1o9OCW_MvSHKr1CN0pXjzj70aHPL7AEBf&sz=w1920",
          "id": "art-1793421605032-avrf",
          "showInMain": false,
          "type": "티저 포스터",
          "caption": ""
        },
        {
                    "id": "art-1793421626166-bgbp",
          "title": "",
          "type": "런칭 포스터",
          "imageUrl": "https://drive.google.com/thumbnail?id=1BiNEXIjPiguvbhDQMYCQq6wZ4Zv8iUpB&sz=w1920",
          "showInMain": false,
          "caption": ""
        },
        {
          "caption": "",
          "showInMain": false,
          "id": "art-1793421642894-h4mc",
                    "imageUrl": "https://drive.google.com/thumbnail?id=1iI5dFjz5x557K4Kq-cDo8Ly3Zbkl2w4Z&sz=w1920",
          "type": "스페셜 포스터",
          "title": ""
        },
        {
          "caption": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=1UuL3nmJXw6vqJCy-vnt3WK0dfLNwwxlD&sz=w1920",
          "id": "art-1793446605815-j8uf",
          "title": "",
          "designer": "Lighthouse",
          "showInMain": true,
          "type": "메인 오리지널"
        },
        {
          "showInMain": true,
          "type": "티저 오리지널",
          "title": "",
          "imageUrl": "https://drive.google.com/thumbnail?id=1ozqukEOLb5JRmRZZNxdwq7o4-cFYQAye&sz=w1920",
          "id": "art-1793446680213-hkiz",
          "designer": "Lighthouse",
          "caption": ""
        },
        {
          "imageUrl": "https://drive.google.com/thumbnail?id=1UZ4OoJqHy8lvBqA_dvTnA3tdIcHHr0sQ&sz=w1920",
          "type": "프리미어 오리지널",
          "id": "art-1793446709882-8cq9",
          "designer": "Lighthouse",
          "title": "",
          "caption": "",
          "showInMain": true
        }
      ],
      "director": "Shinji Aoyama",
      "youtubeUrl": "https://youtu.be/IaO7sEcnfiw?si=2zMT9b6Dj-wc8XPL",
      "year": "2000",
      "summary": "",
      "titleKo": "유레카",
      "heroImage": "https://drive.google.com/thumbnail?id=1IP7_pyVxmRmp_INzMzkoFfmC192bTyNM&sz=w1920",
      "summaryKo": "버스 납치 사건에서 극적으로 살아남은 운전사 마코토와 어린 남매 나오키, 코즈에. 사건 이후 각자 흩어져 방황하던 이들은 몇 년 후 다시 만나 기묘한 동거를 시작하고, 낡은 버스를 타고 여행을 떠난다."
    }
  ],
  "director": {
    "photo": "https://drive.google.com/thumbnail?id=1cwkz_Lp5UG-ttg1MFRcycPnbNdhVOLck&sz=w1920",
    "quote": "Photography is truth. The cinema is truth twenty-four times per second."
  },
  "directorNotes": [
    {
      "id": "note-1",
      "quote": "Photography is truth. The cinema is truth twenty-four times per second.",
      "photo": "https://drive.google.com/thumbnail?id=1cwkz_Lp5UG-ttg1MFRcycPnbNdhVOLck&sz=w1920",
      "directorName": "Jean-Luc Godard",
      "filmTitle": "Le Petit Soldat",
      "visible": true
    }
  ],
  "directorNotesVisible": true,
  "promo": {
    "image": "/images/promo-example.jpg",
    "subtitle": "영화 밖에서 이어지는 새로운 경험",
    "url": "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
    "titleLines": [
      "Objects &",
      "Moving Images."
    ]
  },
  "promos": [
    {
      "image": "/images/promo-example.jpg",
      "badgeTopRight": "",
      "kicker": "EXPLORE BEYOND THE SCREEN",
      "titleLines": [
        "Objects &",
        "Moving Images."
      ],
      "badgeTopLeft": "LIGHTHOUSE",
      "id": "promo-1",
      "visible": true,
      "ctaText": "STORE / EXPLORE",
      "url": "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
      "subtitle": ""
    }
  ],
  "promosVisible": true,
  "contact": {
    "email": "keeper@lighthouse.re.kr",
    "xUrl": "https://x.com/filmxlighthouse",
    "inquiryEndpoint": "https://script.google.com/macros/s/AKfycbx5J9UTRPe0IM9mRuEUbhs9fjDnJOZgqgiGfTlD9DyQEOpJ-TDCTArqym1iRo3o-_qVqg/exec",
    "youtubeUrl": "https://www.youtube.com/channel/UCZGkkk92ozbMX4Zo3WYCSbg",
    "instagramUrl": "https://www.instagram.com/filmlighthouse"
  },
  "artworksVisible": true,
  "journalVisible": true,
  "journalPosts": [
    {
      "id": "journal-1",
      "title": "라이트하우스의 태도: 예술영화관 프로그래머에서 배급사로",
      "subtitle": "영화 프로그램의 맥락과 관객의 만남을 발명하는 일에 관하여",
      "date": "2026.03.15",
      "category": "ESSAY",
      "imageUrl": "https://drive.google.com/thumbnail?id=1jhnAZUeGoWayGiVtCGtTBT-fwPnIUOeZ&sz=w1920",
      "content": "라이트하우스는 예술영화관 프로그래머에 의해 설립된 영화 수입/배급사입니다.\n\n영화관이라는 물리적 공간에서 관객과 영화가 맺는 긴밀한 호흡을 지켜보며, 우리는 좋은 영화를 온전히 전달하기 위해선 배급의 첫 시작부터 상영의 마지막 순간까지 하나의 일관된 맥락이 설계되어야 한다는 것을 배웠습니다.\n\n단순히 판권을 구매해 스크린에 거는 일에 그치지 않고, 동시대 관객들에게 가장 유효한 영화적 언어로 포스터와 카피, 상영 방식을 발명합니다. 라이트하우스 저널은 그 치열한 고민과 기록을 관객들과 함께 나누는 공간입니다.",
      "author": "LIGHTHOUSE",
      "visible": true,
      "visibleOnMain": true,
      "visibleOnBoard": true
    },
    {
      "id": "journal-2",
      "title": "자크 드미의 〈쉘부르의 우산〉: 영원히 울려 퍼지는 색채와 멜로디",
      "subtitle": "모든 대사가 노래가 되는 누벨바그의 찬란한 순간",
      "date": "2026.02.24",
      "category": "CRITIQUE",
      "imageUrl": "https://drive.google.com/thumbnail?id=18W3HeS0sR5HP_Fd-FZO-yZWYVuYYwyNQ&sz=w1920",
      "content": "1964년 칸 영화제 황금종려상 수상작인 〈쉘부르의 우산〉은 영화사상 가장 독창적인 송스루(Sung-through) 뮤지컬 영화 중 하나입니다.\n\n미셸 르그랑의 서정적인 음악과 자크 드미 감독 특유의 파스텔톤 색채 미학은 비극적인 사랑의 현실을 역설적으로 가장 찬란하고 아름답게 직조해 냅니다. 전쟁이라는 시대적 비극 앞에서도 시들지 않는 청춘의 순수함을 다시 한번 스크린에서 마주합니다.",
      "author": "PROGRAMMER NOTE",
      "visible": true,
      "visibleOnMain": true,
      "visibleOnBoard": true
    },
    {
      "id": "journal-3",
      "title": "로스 맥켈위와 사적 다큐멘터리의 힘: 〈리메이크〉를 준비하며",
      "subtitle": "카메라를 든 1인칭 관찰자가 기록한 시간과 기억의 초상",
      "date": "2026.01.18",
      "category": "NOTE",
      "imageUrl": "https://drive.google.com/thumbnail?id=1HdHZ-uFpA7weB2SiSLXwXjVBZ7cBY_fU&sz=w1920",
      "content": "로스 맥켈위 감독의 영화들은 언제나 자신의 가족과 일상, 그리고 그 안에 얽힌 역사를 응시하는 것에서 시작합니다.\n\n〈셔먼의 행진〉에서부터 최신작 〈리메이크〉에 이르기까지, 맥켈위는 상실과 슬픔, 유머와 성찰을 교차시키며 사적인 기록이 어떻게 보편적인 영화적 감동으로 확장될 수 있는지를 증명합니다.",
      "author": "LIGHTHOUSE",
      "visible": true,
      "visibleOnMain": true,
      "visibleOnBoard": true
    }
  ],
  "mainArtworkIds": [
    "art-1793445304439-vdb8",
    "art-1793436666108-cvh6",
    "art-1793436808397-fpfd",
    "art-1793446180558-dqap",
    "art-1793440037531-ywgv",
    "remake-main",
    "umbrella-main",
    "sherman-main",
    "art-1793421605032-avrf",
    "art-1793420431889-t8mf",
    "art-1793446194539-rtnr",
    "art-1793421626166-bgbp",
    "art-1793421642894-h4mc"
  ]
};
