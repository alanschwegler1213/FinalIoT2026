import Panel from "./Panel";
import { ComoFunciona, LaPlanta } from "./Info";

export default function Home() {
  return (
    <Panel>
      <LaPlanta />
      <ComoFunciona />
    </Panel>
  );
}
