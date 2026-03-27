import { createContext, useContext, useState } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

type DnDContextType = [string | null, Dispatch<SetStateAction<string | null>>];

const DnDContext = createContext<DnDContextType>([null, () => {}]);

export const DnDProvider = ({ children }: { children: ReactNode }) => {
  const [type, setType] = useState<string | null>(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

export default DnDContext;

export const useDnD = () => {
  return useContext(DnDContext);
};
