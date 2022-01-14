export class FnResponseData<TData> {
  constructor(public readonly data: TData) {}
}

export class FnResponseError<TErr> {
  constructor(public readonly error: TErr) {}
}

export type FnResponse<TData = undefined, TErr = string> =
  | FnResponseData<TData>
  | FnResponseError<TErr>;
