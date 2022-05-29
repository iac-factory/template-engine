import * as FS from "fs";
import * as Path from "path";
import * as Input from "readline";
import * as Utility from "util";
import * as Process from "process";

import * as ANSI from "ansi-colors";

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
 * await Template.hydrate("package.template.json", "package.hydration.json");
 *
 */

export class Template {
    static file?: string | null;
    static buffer?: Buffer | null;
    static contents?: Buffer | null;

    static keys = RegExp( "{{%(.*.[a-zA-Z0-9-].*.)%}}", "mgid" );

    static symbols: Template[] = [];

    key: string;
    pattern: string;
    output: string;
    start: [ number, number ] | null = null;
    end: [ number, number ] | null = null;

    /***
     * The following constructor is for internal module-use only.
     *
     * <br/>
     *
     * Please use {@link Template.hydrate} for module API.
     *
     * @param expressions
     * @private
     */
    private constructor( expressions: RegExpExecArray ) {
        this.key = expressions[ 1 ]!.trim() as string;
        this.pattern = expressions[ 0 ] as string;
        this.output = "";

        Template.symbols.push( this );
    }

    private async inject() {
        console.clear();
        /*** @todo - Refactor (Chore) ... Damn chalk library */

        const Chalk = {
            redBright: ( input: string ) => ANSI.redBright( input ),
            underline: {
                bold: ( input: string ) => ANSI.underline( ANSI.bold( input ) )
            },
            green: ( input: string ) => ANSI.bold( ANSI.greenBright( input ) )
        };
        const contents = String( Template.read() );

        const preface = contents.replace( this.pattern, Chalk.underline.bold( Chalk.redBright( this.pattern ) ) );

        process.stdout.write( "Template, Input" + ":" + " " + preface + "\n" );

        const replacement = await Template.prompt( this.key );
        console.clear();
        const colorize = contents.replace( this.pattern, Chalk.green( replacement ) );
        const template = contents.replace( this.pattern, replacement );

        process.stdout.write( "Template, Output" + ":" + " " + colorize + "\n" );

        const confirmation = await Template.confirm();
        console.clear();

        this.output = template;

        ( confirmation ) || await this.inject();

        Template.update( Buffer.from( template ) );
    }

    /***
     * Template File Hydration
     *
     * @example
     * import { Template } from "@iac-factory/template-engine";
     *
     * (async () => Template.hydrate("package.template.json", "package.hydration.json"))();
     *
     * export {}
     *
     * @param {FS.PathLike | string} source - The source template file
     * @param {FS.PathLike | string} destination - The target hydrated file
     * @param debug
     */
    public static async hydrate( source: string, destination: string, debug?: boolean ) {
        ( debug ) && console.debug( "[Debug]", "Debug Mode is Enabled" );

        Template.initialize( source, debug );

        await Template.populate( debug );

        Template.write( destination );

        /***
         * ... One of the many more recent reasons why I'm personally
         * no longer interested in classes ...
         *
         * The requirement of having synchronous constructors in a
         * completely asynchronous runtime language is beyond me.
         *
         */

        Template.file = null;
        Template.buffer = null;
        Template.contents = null;

        Template.symbols = [];

        process.stdout.write("file://" + Path.resolve(destination) + "\n");
    }

    private static initialize = ( template: string, debug = false ) => {
        Template.file = template;
        Template.contents = FS.readFileSync( template );
        Template.update( FS.readFileSync( template ) );

        ( debug ) && console.debug( "[Debug]", "File", Template.file );
        ( debug ) && console.debug( "[Debug]", "Contents", Template.contents );

        const match = Template.keys.exec( String( Template.contents ) );
        ( debug ) && console.log( Template, "\n" );

        if ( match ) for ( const _ of match ) {
            ( debug ) && console.debug( "[Debug]", "Matcher", "\"" + _.trim() + "\"", "\n" );

            new Template( match );
        }

        ( debug ) && console.log( Template, "\n" );
    };

    public static async populate( debug?: boolean ) {
        if ( Template.symbols.length === 0 ) {
            console.warn( "[Warning] Template's State isn't Applicable to Hydration" );
            Process.exit( 0 );
        }

        const unique = [ ...new Map( Template.symbols.map( ( item ) => {
            return [ item[ "key" ], item ];
        } ) ).values() ];

        Template.symbols = unique;

        ( debug ) && console.debug( "[Debug]", "Symbol Iterator", Template.symbols, "\n" );

        for await ( const $ of Template.symbols ) {
            ( debug ) && console.debug( "[Debug]", "Symbol", $, "\n" );
            await $.inject();
        }
    }

    private static write( target: string ) {
        FS.writeFileSync( target, /* String(Template.file) */ String( Template.read() ) );

        return true;
    }

    private static read = () => Template.buffer;
    private static update( content: Buffer ) {
        Template.buffer = content;
    }

    private static async query( content: string ) {
        const Interface = Input.createInterface( {
            input: Process.openStdin(),
            output: Process.stdout
        } );

        const prompt: () => Promise<string> = async () => await new Promise( ( resolve ) => {
            const prompt = Utility.promisify( Interface.question ).bind( Interface );

            resolve( ( async () => String( await prompt( content ) ) as string )() );
        } );

        const result = await prompt();

        Interface.close();

        return result;
    }

    private static async prompt( title: string ) {
        const Input = async () => await Template.query( title + ":" + " " );

        let $ = String( await Input().then( ( output ) => output ) );

        while ( $.trim().length === 0 ) $ = String( await Input().then( ( $ ) => $ ) );

        return $.trim();
    }

    private static async confirm() {
        const Input = async () => await Template.query( "Continue (Y/N)" + " ? " );

        const client: { input: any } = { input: null };

        do {
            client.input = String( await Input().then( ( $ ) => $ ) );
        } while ( client.input.trim().length === 0 && ( String( client.input.trim() ).toLowerCase() !== "y" || String( client.input.trim() ).toLowerCase() !== "n" ) );

        console.clear();

        return ( client.input === "y" );
    }
}

export default Template;
