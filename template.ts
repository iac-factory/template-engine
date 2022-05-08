import * as FS from "fs";
import * as Input from "readline";
import * as Utility from "util";
import * as Process from "process";

/***
 * Content-Buffer Template Handler
 *
 * - Read input as buffer or string, search for utf-8 encoded, or
 * otherwise readable regular-expression matches, and prompt
 * user for inline replacement(s) if applicable
 *
 * - Additional utility methods and validation functions
 *
 * @example
 * await Template.hydrate("source.template.json", "source.json");
 *
 */

class Template {
    static file?: string | null;
    static buffer?: Buffer | null;
    static contents?: Buffer | null;

    static keys = RegExp("{{%(.*.[a-zA-Z0-9-].*.)%}}", "mgid");

    static symbols: Template[] = [];

    key: string;
    pattern: string;
    output: string;
    start: [number, number] | null = null;
    end: [number, number] | null = null;

    private constructor($: RegExpExecArray) {
        this.key = $[ 1 ]!.trim() as string;
        this.pattern = $[ 0 ] as string;
        this.output = ""

        Template.symbols.push(this);
    }

    private async inject() {
        const $ = await import("chalk")

        const Chalk = new $.Chalk();

        const contents = String(Template.read());

        const preface = contents.replace(this.pattern, Chalk.underline.bold(Chalk.redBright(this.pattern)));

        console.log("Template, Input" + ":", preface, "\n");

        const replacement = await Template.prompt(this.key);
        const colorize = contents.replace(this.pattern, Chalk.underline.bold(Chalk.redBright(replacement)));
        const template = contents.replace(this.pattern, replacement);

        console.log("Template, Output" + ":", colorize, "\n");

        const confirmation = await Template.confirm();

        this.output = template;

        ( confirmation ) || await this.inject();

        Template.update(Buffer.from(template));
    }

    public static async hydrate (template: string, target: string) {
        Template.initialize(template);

        await Template.populate();

        Template.write(target);

        Template.file = null;
        Template.buffer = null;
        Template.contents = null;

        Template.symbols = [];
    }

    private static initialize = (template: string, debug = false) => {
        Template.file = template;
        Template.contents = FS.readFileSync(template);
        Template.update(FS.readFileSync(template));

        const $ = {match: null};

        // @ts-ignore
        while (($.match = Template.keys.exec(String(Template.contents))) !== null) {
            // @ts-ignore
            // Avoid Infinite Loops with Zero-Width Matches
            ($.match.index === $.match.lastIndex) && $.match.lastIndex++;

            (debug) && console.log(Template, "\n");

            new Template($.match);
        }

        (debug) && console.log(Template, "\n");
    }

    public static async populate () {
        if (Template.symbols.length === 0) {
            console.warn("[Warning] Template's State isn't Applicable to Hydration");
            Process.exit(0);
        }

        for await (const $ of Template.symbols) {
            await $.inject();
        }
    }

    private static write (target: string) {
        /// (archive) && FS.copyFileSync(String(Template.file), archive);

        FS.writeFileSync(target, /* String(Template.file) */ String(Template.read()));

        return true;
    }

    private static read = () => Template.buffer;
    private static update (content: Buffer) {
        Template.buffer = content;
    }

    private static async query(content: string) {
        const Interface = Input.createInterface({
            input: Process.openStdin(),
            output: Process.stdout
        });

        const $ = new Promise((resolve) => {
            const prompt = Utility.promisify(Interface.question).bind(Interface);

            resolve((async () => await prompt(content))());
        });

        await $;

        Interface.close();

        return $;
    }

    private static async prompt(title: string) {
        const Input = async () => await Template.query(title + ":" + " ");

        let $ = String(await Input().then((output) => output));

        while ( $.trim().length === 0 ) $ = String(await Input().then(($) => $));

        return $.trim();
    }

    private static async confirm() {
        const Input = async () => await Template.query("Continue (Y/N) ?" + " ");

        let $ = String(await Input().then((output) => output));

        while ( $.trim().length === 0 && ( String($.trim()).toLowerCase() !== "y" || String($.trim()).toLowerCase() !== "n" ) ) $ = String(await Input().then(($) => $));

        return ( $ === "y" );
    }
}

export { Template };

export default Template;
