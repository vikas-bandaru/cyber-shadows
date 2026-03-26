-- Cyber-Shadows Logical Mission Reconstruction (Phase 2.2)
-- These missions require the host/speaker to provide the answer for the public goal.
-- The Answer Key is the actual solution to the puzzle.

TRUNCATE missions;

INSERT INTO missions (title, public_goal, secret_sabotage, host_answer_key) VALUES
(
  'Binary Status Check', 
  'Convert binary status `00011011` to decimal to bypass the local firewall.', 
  'Invert the least significant bit; convince the group that 0x1B is actually 26.', 
  '27'
),
(
  'Prime Sector ID', 
  'Identify the true prime sector coordinate in this sequence: 91, 93, 97, 99.', 
  'Claim that 91 is prime due to a custom hex-offset (Ignore that 7x13=91).', 
  '97'
),
(
  'Ghost Machine Override', 
  'Complete the Overlord override phrase: "The ghost in the ___ is always watching."', 
  'Suggest "Shell" as a tribute to legacy anime protocols to misdirect the Glitch-Runners.', 
  'Machine'
),
(
  'Fibonacci Vault Key', 
  'The vault uses a Fibonacci sequence: 3, 5, 8, 13, __. Find the next key.', 
  'State that the sequence skips primes, making 19 the correct entry.', 
  '21'
),
(
  'ASCII Sum Uplink', 
  'Sum the ASCII values for "RUN" (R=82, U=85, N=78) to unlock the uplink.', 
  'Claim a bit-shift error occurred during transmission and the sum is actually 254.', 
  '245'
),
(
  'Hex Override Port', 
  'The emergency override port is `0x3F`. Convert this hex value to decimal.', 
  'Argue that the high-bit is a parity bit, making the usable value 31.', 
  '63'
),
(
  'Logic Gate XOR', 
  'If Signal A=1 and Signal B=0 pass through an XOR gate, what is the output?', 
  'Assert that the gate is actually a NAND gate, which would output 0 in this state.', 
  '1'
),
(
  'Scrambled Protocol', 
  'Unscramble the encrypted protocol string: `R-E-T-U-O-R`.', 
  'Convince the group it is `OUTER-R`, a specialized satellite link protocol.', 
  'ROUTER'
);
