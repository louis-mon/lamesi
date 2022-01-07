export type TranslationKeys = {
  goBack: {
    title: string;
    contents: string;
  };
  general: {
    ok: string;
    cancel: string;
  };
};

type ToDotted<
  Prefix extends string,
  Data extends { [k: string]: any },
> = Data extends string
  ? Prefix
  : {
      [k in keyof Data]: ToDotted<
        Prefix extends "" ? k : `${Prefix}.${k extends string ? k : ""}`,
        Data[k]
      >;
    }[keyof Data];

export type DottedKey = ToDotted<"", TranslationKeys>;
