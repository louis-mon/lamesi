import { DottedKey } from "/src/i18n/keys";

interface CreditEntry {
  label: string;
  link?: string;
}

function label(s: string): CreditEntry {
  return {
    label: s,
  };
}

interface CreditCategory {
  category: DottedKey;
  entries: CreditEntry[];
}

export const credits: CreditCategory[] = [
  {
    category: "credits.realisation",
    entries: [label("Louis Monestier"), label("Pierre Monestier")],
  },
  {
    category: "credits.programming",
    entries: [label("Louis Monestier")],
  },
  {
    category: "credits.graphics",
    entries: [
      label("Louis Monestier"),
      label("Pierre Monestier"),
      {
        label: '"Small flame pack" by serenajeanne licensed CC BY-SA 3.0',
        link: "https://opengameart.org/content/small-flame-pack-0",
      },
      {
        label: '"Pointers: part 5" by yd liscensed CC0',
        link: "https://opengameart.org/content/pointers-part-5",
      },
    ],
  },
  {
    category: "credits.music",
    entries: [
      {
        label:
          '"Basic Activate.wav" by SirusAmory -- License: Creative Commons 0',
        link: "https://freesound.org/s/460584/",
      },
      {
        label:
          '"Basic Deactivate.wav" by SirusAmory -- License: Creative Commons 0',
        link: "https://freesound.org/s/460583/",
      },
      {
        label:
          '"Ringing a Hand Bell.wav" by Tewkesound -- License: Attribution 4.0',
        link: "https://freesound.org/s/140150/",
      },
      {
        label:
          '"Appearance Effect" by The-Sacha-Rush -- License: Creative Commons 0',
        link: "https://freesound.org/s/472506/",
      },
      {
        label: '"Rise of fire" by Maksym Dudchyk',
        link: "https://pixabay.com/users/white_records-32584949/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=217682",
      },
      {
        label: '"Laboratory" by Leonid Timachev',
        link: "https://pixabay.com/users/amarantamusic-7819462/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=112141",
      },
    ],
  },
  {
    category: "credits.software",
    entries: [label("Phaser 3"), label("asesprite"), label("krita")],
  },
  {
    category: "credits.thanks",
    entries: [
      label("Matthieu"),
      label("Younes"),
      label("Jerôme"),
      label("Alex"),
    ],
  },
];
