const { query } = require('../apps/api/dist/db.js');

async function migrateDatabaseTo7CarsAndDrivers() {
  console.log('=== Starting Migration: Keep Exactly 1 Car Per Type (7 Cars) & 1 Assigned Driver Each ===');

  // 1. Identify distinct cars by make and model
  const carTypesRes = await query(`
    SELECT DISTINCT ON (make, model) id, reg_no, make, model, capacity
    FROM buses
    ORDER BY make, model, reg_no ASC;
  `);

  console.log(`Found ${carTypesRes.rows.length} distinct car types in database.`);
  console.table(carTypesRes.rows);

  const carAssignments = [
    { reg_no: 'MH-12-DT-0001', make: 'Tata Motors', model: 'Nexon EV Max', capacity: 5 },
    { reg_no: 'MH-12-DT-0002', make: 'MG Motor', model: 'ZS EV Exclusive', capacity: 5 },
    { reg_no: 'MH-12-DT-0003', make: 'Hyundai', model: 'Ioniq 5 Electric', capacity: 5 },
    { reg_no: 'MH-12-DT-0004', make: 'Mahindra', model: 'XUV400 EV Pro', capacity: 5 },
    { reg_no: 'MH-12-DT-0005', make: 'Tata Motors', model: 'Tigor EV Sedan', capacity: 4 },
    { reg_no: 'MH-12-DT-0006', make: 'Toyota', model: 'Innova HyCross Hybrid', capacity: 7 },
    { reg_no: 'MH-12-DT-0007', make: 'Maruti Suzuki', model: 'Dzire Tour EV', capacity: 4 },
  ];

  const targetBusIds = [];
  for (const item of carAssignments) {
    const found = carTypesRes.rows.find((r) => r.make === item.make && r.model === item.model);
    if (found) {
      // Clear any potential reg_no collisions first if needed
      await query(`UPDATE buses SET reg_no = $1, capacity = $2 WHERE id = $3;`, [item.reg_no, item.capacity, found.id]);
      targetBusIds.push(found.id);
    }
  }

  console.log('Selected 7 Car IDs:', targetBusIds);

  // 2. Select 7 Drivers and assign realistic professional Pune names & contact info
  const realDrivers = [
    { name: 'Ganesh Jadhav', phone: '+919822001122', license: 'MH-14-2018-0045129', address: 'Kothrud, Pune' },
    { name: 'Sunil Patil', phone: '+919822003344', license: 'MH-14-2019-0098432', address: 'Shivajinagar, Pune' },
    { name: 'Ramesh More', phone: '+919822005566', license: 'MH-14-2020-0012876', address: 'Baner, Pune' },
    { name: 'Sachin Gaikwad', phone: '+919822007788', license: 'MH-14-2021-0023847', address: 'Hadapsar, Pune' },
    { name: 'Rahul Pawar', phone: '+919822009900', license: 'MH-14-2022-0034958', address: 'Warje, Pune' },
    { name: 'Deepak Shinde', phone: '+919822002211', license: 'MH-14-2023-0046069', address: 'Katraj, Pune' },
    { name: 'Santosh Deshmukh', phone: '+919822004433', license: 'MH-14-2024-0057170', address: 'Nigdi, Pune' },
  ];

  const driversRes = await query(`
    SELECT d.id as driver_id, d.user_id
    FROM drivers d
    ORDER BY d.id ASC
    LIMIT 7;
  `);

  const targetDriverIds = [];
  const targetUserIds = [];

  for (let i = 0; i < driversRes.rows.length; i++) {
    const dRow = driversRes.rows[i];
    const profile = realDrivers[i];
    targetDriverIds.push(dRow.driver_id);
    targetUserIds.push(dRow.user_id);

    // Update user name, phone, email
    await query(
      `UPDATE users SET name = $1, phone = $2, email = $3 WHERE id = $4;`,
      [profile.name, profile.phone, `driver${i + 1}@deccantransit.in`, dRow.user_id]
    );

    // Update driver duty_status and licence_class
    await query(
      `UPDATE drivers SET licence_class = 'HMV-Passenger', duty_status = 'available' WHERE id = $1;`,
      [dRow.driver_id]
    );
  }

  console.log('Selected 7 Driver IDs:', targetDriverIds);

  // 3. Clear and set driver_assignments 1-to-1
  console.log('Configuring 1-to-1 Driver to Car assignments...');
  await query(`DELETE FROM driver_assignments;`);
  for (let i = 0; i < 7; i++) {
    const busId = targetBusIds[i];
    const driverId = targetDriverIds[i];
    await query(`
      INSERT INTO driver_assignments (id, org_id, bus_id, driver_id, start_date, end_date)
      VALUES (gen_random_uuid(), '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000', $1, $2, CURRENT_DATE, CURRENT_DATE + interval '1 year');
    `, [busId, driverId]);
  }

  // 4. Update latest_bus_locations for the 7 cars across Pune
  console.log('Updating latest_bus_locations for 7 cars...');
  const busParams = targetBusIds.map((_, i) => `$${i + 1}`).join(',');
  await query(`DELETE FROM latest_bus_locations WHERE bus_id NOT IN (${busParams});`, targetBusIds);

  const puneLocations = [
    { lat: 18.5204, lng: 73.8567, status: 'moving', speed: 38, heading: 92 },  // Swargate / JM Road
    { lat: 18.5314, lng: 73.8446, status: 'moving', speed: 28, heading: 45 },  // Shivajinagar
    { lat: 18.5913, lng: 73.7389, status: 'stopped', speed: 0, heading: 180 }, // Hinjawadi Phase 3
    { lat: 18.5516, lng: 73.9512, status: 'moving', speed: 42, heading: 270 }, // Kharadi EON IT Park
    { lat: 18.5042, lng: 73.8078, status: 'moving', speed: 32, heading: 60 },  // Kothrud Vanaz
    { lat: 18.5621, lng: 73.9168, status: 'moving', speed: 35, heading: 120 }, // Viman Nagar
    { lat: 18.5126, lng: 73.9367, status: 'stopped', speed: 0, heading: 0 },   // Magarpatta Cyber City
  ];

  for (let i = 0; i < 7; i++) {
    const busId = targetBusIds[i];
    const loc = puneLocations[i];
    await query(`
      INSERT INTO latest_bus_locations (
        bus_id, org_id, lat, lng, speed_kmh, heading_deg, accuracy_m,
        recorded_at, received_at, source, battery_pct, status, status_since, rev
      ) VALUES (
        $1, '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000', $2, $3, $4, $5, 4.5,
        now(), now(), 'phone', 85, $6, now(), nextval('live_rev_seq')
      )
      ON CONFLICT (bus_id) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        speed_kmh = EXCLUDED.speed_kmh,
        heading_deg = EXCLUDED.heading_deg,
        status = EXCLUDED.status,
        battery_pct = 85,
        recorded_at = now(),
        received_at = now(),
        rev = nextval('live_rev_seq');
    `, [busId, loc.lat, loc.lng, loc.speed, loc.heading, loc.status]);
  }

  // 5. Clean up dependent foreign keys for other buses and drivers
  console.log('Cleaning up foreign key references in other tables...');
  const driverParams = targetDriverIds.map((_, i) => `$${i + 1}`).join(',');

  await query(`DELETE FROM trips WHERE bus_id NOT IN (${busParams});`, targetBusIds);
  await query(`DELETE FROM trips WHERE driver_id NOT IN (${driverParams});`, targetDriverIds);

  await query(`DELETE FROM trip_templates WHERE default_bus_id NOT IN (${busParams});`, targetBusIds);
  await query(`DELETE FROM trip_templates WHERE default_driver_id NOT IN (${driverParams});`, targetDriverIds);

  await query(`DELETE FROM alerts WHERE bus_id NOT IN (${busParams});`, targetBusIds);
  await query(`DELETE FROM alerts WHERE driver_id NOT IN (${driverParams});`, targetDriverIds);

  await query(`DELETE FROM incidents WHERE driver_id NOT IN (${driverParams});`, targetDriverIds);
  await query(`DELETE FROM consents WHERE driver_id NOT IN (${driverParams});`, targetDriverIds);

  // Find extra driver user_ids to clean auth_sessions and installations
  const extraUsersRes = await query(`
    SELECT id FROM users 
    WHERE role = 'driver' AND id NOT IN (${targetUserIds.map((_, i) => `$${i + 1}`).join(',')});
  `, targetUserIds);
  const extraUserIds = extraUsersRes.rows.map((r) => r.id);

  if (extraUserIds.length > 0) {
    const extraUserParams = extraUserIds.map((_, i) => `$${i + 1}`).join(',');
    await query(`DELETE FROM auth_sessions WHERE user_id IN (${extraUserParams});`, extraUserIds);
    await query(`DELETE FROM installations WHERE user_id IN (${extraUserParams});`, extraUserIds);
    await query(`DELETE FROM idempotency_keys WHERE user_id IN (${extraUserParams});`, extraUserIds);
  }

  // 6. Delete other buses (93 buses)
  const delBuses = await query(
    `DELETE FROM buses WHERE id NOT IN (${busParams}) RETURNING id;`,
    targetBusIds
  );
  console.log(`Deleted ${delBuses.rows.length} extra buses.`);

  // 7. Delete other drivers (93 drivers)
  const delDrivers = await query(
    `DELETE FROM drivers WHERE id NOT IN (${driverParams}) RETURNING id;`,
    targetDriverIds
  );
  console.log(`Deleted ${delDrivers.rows.length} extra drivers.`);

  // 8. Delete extra driver users
  if (extraUserIds.length > 0) {
    const delUsers = await query(`
      DELETE FROM users 
      WHERE role = 'driver' AND id NOT IN (${targetUserIds.map((_, i) => `$${i + 1}`).join(',')})
      RETURNING id;
    `, targetUserIds);
    console.log(`Deleted ${delUsers.rows.length} extra driver user accounts.`);
  }

  // 9. Verify Final State in PostgreSQL
  const finalBuses = await query(`SELECT reg_no, make, model, capacity FROM buses ORDER BY reg_no ASC;`);
  const finalDrivers = await query(`
    SELECT d.id, u.name, u.phone, u.email, d.licence_class, d.duty_status
    FROM drivers d
    JOIN users u ON u.id = d.user_id
    ORDER BY u.name ASC;
  `);
  const finalAssignments = await query(`
    SELECT da.id, b.reg_no, b.make, b.model, u.name as driver_name, u.phone as driver_phone
    FROM driver_assignments da
    JOIN buses b ON b.id = da.bus_id
    JOIN drivers d ON d.id = da.driver_id
    JOIN users u ON u.id = d.user_id
    ORDER BY b.reg_no ASC;
  `);
  const finalLocations = await query(`
    SELECT l.bus_id, b.reg_no, b.make, b.model, l.status, l.speed_kmh, l.lat, l.lng
    FROM latest_bus_locations l
    JOIN buses b ON b.id = l.bus_id
    ORDER BY b.reg_no ASC;
  `);

  console.log('\n=============================================');
  console.log(`✅ FINAL DATABASE BUSES COUNT: ${finalBuses.rows.length}`);
  console.table(finalBuses.rows);

  console.log('\n=============================================');
  console.log(`✅ FINAL DATABASE DRIVERS COUNT: ${finalDrivers.rows.length}`);
  console.table(finalDrivers.rows);

  console.log('\n=============================================');
  console.log(`✅ FINAL DATABASE 1-TO-1 ASSIGNMENTS: ${finalAssignments.rows.length}`);
  console.table(finalAssignments.rows);

  console.log('\n=============================================');
  console.log(`✅ FINAL DATABASE LIVE LOCATIONS: ${finalLocations.rows.length}`);
  console.table(finalLocations.rows);

  process.exit(0);
}

migrateDatabaseTo7CarsAndDrivers().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
