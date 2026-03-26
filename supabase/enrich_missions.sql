-- Cyber-Shadows Mission Enrichment
TRUNCATE missions;

INSERT INTO missions (title, public_goal, secret_sabotage, host_answer_key) VALUES
('Neural Link Jam', 'Sync the neural oscillators to bypass the first firewall layer.', 'Invert the phase of the neural link to trigger a system-wide alert.', '0x9F2E-SY-NC'),
('Ghost Protocol Injection', 'Upload the Ghost Protocol to mask our signatures from the Overlord AI.', 'Modify the payload to include a beacon for the Enforcement Bots.', 'GH-OS-T-V3'),
('Data Vault Decryption', 'Decrypt the primary data vault using the distributed hash key.', 'Introduce a logic bomb that wipes the local buffer upon decryption.', 'VA-UL-T-SH-D'),
('Proxy Re-routing', 'Re-route the network traffic through the deep-web proxies to avoid detection.', 'Redirect the traffic to a honeypot server controlled by the Spies.', 'PR-OX-Y-RO-UT'),
('Biometric Bypass', 'Mimic the biometric signatures of the high-level admins.', 'Alert the biometric scanner to the unauthorized access attempt.', 'BI-O-PA-SS'),
('Core Memory Extraction', 'Extract the core memory fragments from the central mainframe.', 'Corrupt the memory fragments with a recursive virus.', 'CO-RE-EX-TR'),
('Firewall Decompilation', 'Decompile the firewall source code to find a structural weakness.', 'Replace the exploit with a harmless NOP-sled.', 'FW-DE-CO-MP'),
('Satellite Uplink Breach', 'Establish a secure satellite uplink for the final data exfiltration.', 'Transmit our coordinates to the orbital strike platform.', 'SA-T-UP-LI-NK');
