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
}

export interface SiteContent {
  featured: string[];
  films: Film[];
  director: {
    photo: string;
    quote: string;
    name?: string;
  };
  promo?: {
    image: string;
    titleLines: string[];
    subtitle: string;
    url: string;
  };
  promos: PromoCard[];
}

export const INITIAL_CONTENT: SiteContent = {
  featured: ["celine", "eureka", "contempt"],
  films: [
    {
      id: "celine",
      title: "Céline and Julie Go Boating",
      titleKo: "셀린느와 줄리 배 타러 가다",
      release: "2026.09.30",
      director: "Jacques Rivette",
      year: "1974",
      heroImage: "https://cdn.i-scmp.com/sites/default/files/styles/1020x680/public/images/methode/2017/08/17/ae0c4f96-7ccc-11e7-83c9-6be3df13972a_1280x720_105429.jpg?itok=Hxf65raV",
      posterImage: "/assets/aistudio/___________________________________________2_5ecc6cfd.jpg",
      summary: "Two women enter a strange, playful world of memory and fantasy.",
      summaryKo: "파리의 도서관 사서 줄리와 마술사 셀린느. 몽마르트르 공원에서 우연히 마주친 두 여성은 현실과 환상의 경계가 흐려진 미지의 저택으로 발을 들여놓는다. 시간의 법칙이 뒤틀린 연극적 미로 속에서 펼쳐지는 자크 리베트의 가장 유쾌하고 전위적인 시네마틱 모험.",
      country: "France",
      runtime: "193 min",
      youtubeUrl: "https://www.youtube.com/watch?v=k4T0hU2hQ4M"
    },
    {
      id: "eureka",
      title: "Eureka",
      titleKo: "유레카",
      release: "2026.05.27",
      director: "Shinji Aoyama",
      year: "2000",
      heroImage: "https://www.koreafilm.or.kr/upload/programMovieManage/202209/046a2299-cb79-4f3d-88f8-55b6de9d00b9.jpg",
      posterImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      summary: "A journey of survival and connection across the landscapes of Kyushu.",
      summaryKo: "버스 납치 참사에서 살아남은 버스 기사와 두 남매. 세상으로부터 고립된 채 침묵 속에 머물던 이들이 낡은 버스를 타고 규슈의 광활한 대지를 횡단하며 서로의 상처를 보듬고 삶의 재출발을 향해 나아가는 장엄한 로드무비.",
      country: "Japan",
      runtime: "217 min",
      youtubeUrl: "https://www.youtube.com/watch?v=Xh7oQdD5h5k"
    },
    {
      id: "contempt",
      title: "Contempt",
      titleKo: "경멸",
      release: "2026.07.15",
      director: "Jean-Luc Godard",
      year: "1963",
      heroImage: "https://assets.eyefilm.nl/images/production/_2560x1440_crop_center-center_none/still_Le-M%C3%A9pris-Jean-Luc-Godard-FR-1963-1.jpg",
      posterImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      summary: "A film about cinema, love, and the distance between two people.",
      summaryKo: "카프리 섬의 빌라 말라파르테를 배경으로 오디세이아 영화화 작업을 진행하는 시나리오 작가와 그의 아내 카미유. 영화 산업의 자본 논리와 타협 속에서 사랑은 서서히 미묘한 균열과 침묵의 경멸로 변해간다. 장뤽 고다르의 가장 눈부신 시네마스코프 걸작.",
      country: "France / Italy",
      runtime: "103 min",
      youtubeUrl: "https://www.youtube.com/watch?v=7m03j_g7fbg"
    },
    {
      id: "wicker",
      title: "The Wicker Man",
      titleKo: "위커 맨",
      release: "",
      director: "Robin Hardy",
      year: "1973",
      heroImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
      summary: "A mysterious island and a haunting clash of beliefs.",
      summaryKo: "실종된 소녀를 찾기 위해 스코틀랜드 서쪽 외딴 섬 서머아일을 찾은 독실한 경찰 하위 경위. 꽃과 과실이 풍요로운 이 섬에서 주민들은 고대 켈트족의 이교 의식을 숭배하고 있으며, 조사가 깊어질수록 거대한 희생제의의 그림자가 드리운다.",
      country: "United Kingdom",
      runtime: "88 min",
      youtubeUrl: "https://www.youtube.com/watch?v=5FdVm5j_u0U"
    },
    {
      id: "umbrella",
      title: "The Umbrellas of Cherbourg",
      titleKo: "쉘부르의 우산",
      release: "",
      director: "Jacques Demy",
      year: "1964",
      heroImage: "https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
      summary: "영화 소개 문구를 입력해 주세요.",
      summaryKo: "프랑스 노르망디 항구도시 쉘부르. 우산 가게의 쥬느비에브와 자동차 정비공 기의 애틋하고 찬란한 사랑, 그리고 전쟁이 갈라놓은 청춘의 운명. 모든 대사가 노래로 이어지는 자크 드미의 영원한 뮤지컬 클래식.",
      country: "France",
      runtime: "91 min",
      youtubeUrl: "https://www.youtube.com/watch?v=W0nL93_6i_o"
    },
    {
      id: "landscape",
      title: "Landscape in the Mist",
      titleKo: "안개 속의 풍경",
      release: "",
      director: "Theo Angelopoulos",
      year: "1988",
      heroImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      summary: "영화 소개 문구를 입력해 주세요.",
      summaryKo: "한 번도 본 적 없는 아버지를 찾아 독일로 향하는 남매 불라와 알렉산드로스. 안개 자욱한 그리스의 대지를 가로지르는 시적이고 처연한 여정.",
      country: "Greece",
      runtime: "127 min",
      youtubeUrl: "https://www.youtube.com/watch?v=KzXkFv8X7hE"
    },
    {
      id: "remake",
      title: "Remake",
      titleKo: "리메이크",
      release: "",
      director: "Ross McElwee",
      year: "2025",
      heroImage: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80",
      summary: "영화 소개 문구를 입력해 주세요.",
      summaryKo: "자전적 다큐멘터리의 거장 로스 맥엘위의 신작. 흐르는 시간과 필름의 기억, 사라지지 않는 순간들에 관한 사색.",
      country: "USA",
      runtime: "98 min"
    },
    {
      id: "sherman",
      title: "Sherman's March",
      titleKo: "셔먼의 행진",
      release: "",
      director: "Ross McElwee",
      year: "1986",
      heroImage: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1200&q=80",
      summary: "영화 소개 문구를 입력해 주세요.",
      summaryKo: "남북전쟁 셔먼 장군의 진군로를 따라가며 사랑과 고독, 영화와 인생을 유쾌하고 솔직하게 기록한 다큐멘터리 기념비.",
      country: "USA",
      runtime: "157 min"
    },
    {
      id: "lola",
      title: "Lola",
      titleKo: "롤라",
      release: "",
      director: "Jacques Demy",
      year: "1961",
      heroImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
      summary: "영화 소개 문구를 입력해 주세요.",
      summaryKo: "낭트의 카바레 댄서 롤라와 그녀를 둘러싼 엇갈린 인연들. 자크 드미 감독의 눈부신 데뷔작이자 누벨바그의 시적인 찬가.",
      country: "France",
      runtime: "90 min"
    }
  ],
  director: {
    photo: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=2000&q=85",
    quote: "감독의 코멘트를 이곳에 담습니다. 한 문장 한 문장이 오래 머무를 수 있도록."
  },
  promo: {
    image: "/images/promo-example.jpg",
    titleLines: ["Objects &", "Moving Images."],
    subtitle: "영화 밖에서 이어지는 새로운 경험",
    url: "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry"
  },
  promos: [
    {
      id: "promo-1",
      badgeTopLeft: "LIGHTHOUSE / FEATURED PROJECT",
      badgeTopRight: "01 — SPECIAL PROJECT",
      kicker: "EXPLORE BEYOND THE SCREEN",
      titleLines: ["Objects &", "Moving Images."],
      subtitle: "영화 밖에서 이어지는 새로운 경험",
      ctaText: "STORE / EXPLORE",
      url: "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
      image: "/images/promo-example.jpg",
    }
  ]
};
