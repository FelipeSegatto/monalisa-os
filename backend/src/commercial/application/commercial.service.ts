import { Inject, Injectable } from "@nestjs/common";
import { CommercialRepository } from "./commercial.repository";
@Injectable()
export class CommercialService {
  constructor(
    @Inject(CommercialRepository) private readonly repo: CommercialRepository,
  ) {}
  attachSession(...a: Parameters<CommercialRepository["attachSession"]>) {
    return this.repo.attachSession(...a);
  }
  legacyCreate(...a: Parameters<CommercialRepository["legacyCreate"]>) {
    return this.repo.legacyCreate(...a);
  }
  offers(...a: Parameters<CommercialRepository["offers"]>) {
    return this.repo.offers(...a);
  }
  offer(...a: Parameters<CommercialRepository["offer"]>) {
    return this.repo.offer(...a);
  }
  publish(...a: Parameters<CommercialRepository["publish"]>) {
    return this.repo.publish(...a);
  }
  setOfferActive(...a: Parameters<CommercialRepository["setOfferActive"]>) {
    return this.repo.setOfferActive(...a);
  }
  sales(...a: Parameters<CommercialRepository["sales"]>) {
    return this.repo.sales(...a);
  }
  sale(...a: Parameters<CommercialRepository["sale"]>) {
    return this.repo.sale(...a);
  }
  createSale(...a: Parameters<CommercialRepository["createSale"]>) {
    return this.repo.createSale(...a);
  }
  payment(...a: Parameters<CommercialRepository["payment"]>) {
    return this.repo.payment(...a);
  }
  reversePayment(...a: Parameters<CommercialRepository["reversePayment"]>) {
    return this.repo.reversePayment(...a);
  }
  cancelSale(...a: Parameters<CommercialRepository["cancelSale"]>) {
    return this.repo.cancelSale(...a);
  }
  entitlements(...a: Parameters<CommercialRepository["entitlements"]>) {
    return this.repo.entitlements(...a);
  }
  reverseRedemption(
    ...a: Parameters<CommercialRepository["reverseRedemption"]>
  ) {
    return this.repo.reverseRedemption(...a);
  }
  offerSeries(...a: Parameters<CommercialRepository["offerSeries"]>) {
    return this.repo.offerSeries(...a);
  }
}
