import("@iac-factory/ecma");

import { Template } from "@iac-factory/template-engine";

(async () => Template.hydrate("./package.template.json", "./package.hydration.json"))();

export {}