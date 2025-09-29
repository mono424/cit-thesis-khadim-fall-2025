import { Cable } from "lucide-solid";
import { Accessor, Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { ZenohClient } from "~/services/zenoh/client";

const ZenohClientStatus: Component<{
  zenohClient: Accessor<ZenohClient | null>;
}> = ({ zenohClient }) => {
  const [status, setStatus] = createSignal<Status>("loading");

  const updateStatus = () => {
    const client = zenohClient();
    if (!client?.session) {
      setStatus("loading");
      return;
    }

    if (client.session.isClosed()) {
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  createEffect(updateStatus, [zenohClient]);
  setInterval(updateStatus, 2000);

  return (
    <StatusRow
      variant="ghost"
      icon={Cable}
      title="Zenoh-TS Client"
      status={status}
    />
  );
};

export default ZenohClientStatus;
