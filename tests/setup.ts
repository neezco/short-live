import { beforeEach } from "vitest";

import { _resetInstanceCount } from "../src/cache/create-cache";
import { stopSweep } from "../src/sweep/sweep";

beforeEach(() => {
  stopSweep();
  _resetInstanceCount();
});
