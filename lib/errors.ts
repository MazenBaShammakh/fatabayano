export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("rate_limited");
    this.name = "RateLimitError";
  }
}

export class ImageReadError extends Error {
  constructor() {
    super("image_unreadable");
    this.name = "ImageReadError";
  }
}

export class CardExpiredError extends Error {
  constructor() {
    super("card_expired");
    this.name = "CardExpiredError";
  }
}
