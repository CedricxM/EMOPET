import type { ReactNode, CSSProperties, ElementType } from 'react';

type Props = { children: ReactNode; style?: CSSProperties; as?: ElementType };

export const Display = ({ children, style, as: As = 'h1' }: Props) => (
  <As className="h-display" style={style}>
    {children}
  </As>
);

export const H1 = ({ children, style, as: As = 'h1' }: Props) => (
  <As className="h1" style={style}>
    {children}
  </As>
);

export const H2 = ({ children, style, as: As = 'h2' }: Props) => (
  <As className="h2" style={style}>
    {children}
  </As>
);

export const H3 = ({ children, style, as: As = 'h3' }: Props) => (
  <As className="h3" style={style}>
    {children}
  </As>
);

export const Lead = ({ children, style, as: As = 'p' }: Props) => (
  <As className="lead" style={style}>
    {children}
  </As>
);

export const P = ({ children, style, as: As = 'p' }: Props) => (
  <As className="p" style={style}>
    {children}
  </As>
);

export const P2 = ({ children, style, as: As = 'p' }: Props) => (
  <As className="p2" style={style}>
    {children}
  </As>
);

export const Caption = ({ children, style, as: As = 'p' }: Props) => (
  <As className="caption" style={style}>
    {children}
  </As>
);

export const Micro = ({ children, style, as: As = 'span' }: Props) => (
  <As className="micro" style={style}>
    {children}
  </As>
);

export const DataXL = ({ children, style, as: As = 'div' }: Props) => (
  <As className="data-xl" style={style}>
    {children}
  </As>
);

export const DataMD = ({ children, style, as: As = 'div' }: Props) => (
  <As className="data-md" style={style}>
    {children}
  </As>
);
