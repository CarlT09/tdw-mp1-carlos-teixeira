import { expect, test } from "vitest";
import * as constants from "./constants";

test("CMS constants match snapshot", () => {
  expect(constants).toMatchSnapshot();
});
