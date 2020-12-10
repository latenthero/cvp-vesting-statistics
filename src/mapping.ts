import { BigInt, log, store, dataSource } from "@graphprotocol/graph-ts"

import {
  Contract,
  ClaimTokens,
  ClaimVotes,
  DelegateVotes,
  Init,
  Transfer,
  UnclaimedBalanceChanged
} from "../generated/Contract/Contract"
import { VestingDayData, Member } from "../generated/schema"

let VESTING_START_DAY = 18586

export function handleClaimTokens(event: ClaimTokens): void {}

function fetchVestingDayData(dayID: i32): VestingDayData {
  let dayStartTimestamp = dayID * 86400
  let vestingDayData = VestingDayData.load(dayID.toString())
  if (vestingDayData === null) {
    vestingDayData = new VestingDayData(dayID.toString())
    vestingDayData.date = dayStartTimestamp
    vestingDayData.dailyClaimedVotes = BigInt.fromI32(0)
    vestingDayData.save()
  }
  return vestingDayData as VestingDayData
}

export function handleClaimVotes(event: ClaimVotes): void {
  let dayID = event.block.timestamp.toI32() / 86400
  let vestingDayData = fetchVestingDayData(dayID)
  vestingDayData.dailyClaimedVotes = vestingDayData.dailyClaimedVotes.plus(event.params.diff)
  vestingDayData.save()
  //Checking vestingDayData for previous days and creating if they absent
  dayID = dayID - 1
  while ((dayID > VESTING_START_DAY) && (fetchVestingDayData(dayID).dailyClaimedVotes.equals(BigInt.fromI32(0)))) {
    dayID = dayID - 1
  }

  let member = Member.load(event.params.member.toHexString())
  if (member === null) {
    member = new Member(event.params.member.toHexString())
  }
  member.claimedVotes = event.params.newAlreadyClaimedVotes
  member.save()
}

export function handleDelegateVotes(event: DelegateVotes): void {
  log.debug('Delegation. Member: {}, to: {}, prev: {}, votes: {}', [event.params.from.toHexString(),
    event.params.to.toHexString(), event.params.previousDelegate.toHexString(), event.params.adjustedVotes.toHexString()])
  if ((event.params.from.equals(event.params.to)) && (!event.params.from.equals(event.params.previousDelegate))) {
    let member = Member.load(event.params.from.toHexString())
    member.delegatee = null
    member.save()
  }
  if ((!event.params.from.equals(event.params.to)) && (!event.params.to.equals(event.params.previousDelegate))) {
    let member = Member.load(event.params.from.toHexString())
    member.delegatee = event.params.to
    member.save()
  }
}

export function handleInit(event: Init): void {
  let members = event.params.members
  for (let i = 0; i < members.length; i++) {
    let member = new Member(members[i].toHexString())
    member.claimedVotes = BigInt.fromI32(0)
    member.save()
  }
}

export function handleTransfer(event: Transfer): void {
  log.debug('Old member: {}, New member: {}', [event.params.from.toHexString(), event.params.to.toHexString()])
  // No need to add new member here, only remove old.
  // New member already added in handleClaimVotes(), because ClaimVotes event always calls before Transfer event
  store.remove('Member', event.params.from.toHexString())
}

export function handleUnclaimedBalanceChanged(event: UnclaimedBalanceChanged): void {}


