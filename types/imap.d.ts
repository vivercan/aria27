declare module 'imap' {
  import { EventEmitter } from 'events';
  import { TLSSocket } from 'tls';

  interface Config {
    user: string;
    password: string;
    host: string;
    port: number;
    tls?: boolean;
    tlsOptions?: object;
    connTimeout?: number;
    authTimeout?: number;
  }

  interface Box {
    name: string;
    messages: { total: number; new: number };
  }

  interface ImapMessage extends EventEmitter {
    on(event: 'body', listener: (stream: NodeJS.ReadableStream, info: any) => void): this;
    once(event: 'attributes', listener: (attrs: any) => void): this;
    once(event: 'end', listener: () => void): this;
  }

  interface ImapFetch extends EventEmitter {
    on(event: 'message', listener: (msg: ImapMessage, seqno: number) => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
    once(event: 'end', listener: () => void): this;
  }

  class Connection extends EventEmitter {
    constructor(config: Config);
    connect(): void;
    end(): void;
    openBox(name: string, readOnly: boolean, callback: (err: Error | null, box: Box) => void): void;
    seq: {
      fetch(source: string, options: object): ImapFetch;
    };
  }

  export = Connection;
}
