import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutUseCase, RenewUseCase, ReturnUseCase } from './application/circulation.use-cases';
import { LoanQueries, PenaltyCommands, RemindersJob } from './application/loan.queries';
import { CATALOG_GATEWAY, LOAN_POLICY, LOAN_REPOSITORY, PENALTY_REPOSITORY, USER_DIRECTORY } from './domain/ports';
import { loanPolicyFromEnv } from './infrastructure/config/policy';
import { HttpCatalogGateway, HttpUserDirectory } from './infrastructure/external/http-adapters';
import { InternalLoansController, LoansController, PenaltiesController } from './infrastructure/http/controllers';
import { RfidReturnConsumer } from './infrastructure/messaging/rfid-return.consumer';
import { LoanOrmEntity, PenaltyOrmEntity } from './infrastructure/persistence/orm-entities';
import { TypeOrmLoanRepository, TypeOrmPenaltyRepository } from './infrastructure/persistence/repositories';
import { LoansSeeder } from './infrastructure/seed/loans.seeder';

export const LOANS_ENTITIES = [LoanOrmEntity, PenaltyOrmEntity];

@Module({
  imports: [TypeOrmModule.forFeature(LOANS_ENTITIES)],
  controllers: [LoansController, PenaltiesController, InternalLoansController],
  providers: [
    { provide: LOAN_POLICY, useFactory: () => loanPolicyFromEnv() },
    { provide: LOAN_REPOSITORY, useClass: TypeOrmLoanRepository },
    { provide: PENALTY_REPOSITORY, useClass: TypeOrmPenaltyRepository },
    { provide: CATALOG_GATEWAY, useClass: HttpCatalogGateway },
    { provide: USER_DIRECTORY, useClass: HttpUserDirectory },
    CheckoutUseCase,
    ReturnUseCase,
    RenewUseCase,
    LoanQueries,
    PenaltyCommands,
    RemindersJob,
    RfidReturnConsumer,
    LoansSeeder,
  ],
})
export class LoansModule {}
