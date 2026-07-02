import { Modal as RawModal, Radio as RawRadio, RadioGroup as RawRadioGroup, Switch as RawSwitch } from '@heroui/react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

type LooseProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

type ModalRootProps = LooseProps & {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ModalComponent = ComponentType<ModalRootProps> & {
  Backdrop: ComponentType<LooseProps>;
  Container: ComponentType<LooseProps>;
  Dialog: ComponentType<LooseProps>;
  Header: ComponentType<LooseProps>;
  Heading: ComponentType<LooseProps>;
  CloseTrigger: ComponentType<LooseProps>;
  Body: ComponentType<LooseProps>;
  Footer: ComponentType<LooseProps>;
};

type ChoiceProps = LooseProps & {
  value?: string;
  onChange?: (value: string) => void;
};

type SwitchComponent = ComponentType<LooseProps & {
  isSelected?: boolean;
  onChange?: (selected: boolean) => void;
}> & {
  Control: ComponentType<LooseProps>;
  Thumb: ComponentType<LooseProps>;
  Content: ComponentType<LooseProps>;
};

export const Modal = RawModal as unknown as ModalComponent;
export const Radio = RawRadio as unknown as ComponentType<ChoiceProps>;
export const RadioGroup = RawRadioGroup as unknown as ComponentType<ChoiceProps>;
export const Switch = RawSwitch as unknown as SwitchComponent;


