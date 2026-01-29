import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏗️  Seeding database for construction company...\n');

  // Clear existing data in dependency order
  await prisma.payout.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.expenseItem.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.approvalPolicyStep.deleteMany();
  await prisma.approvalPolicy.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.approvalWorkflow.deleteMany();
  await prisma.autoApprovalRule.deleteMany();
  await prisma.budgetAlert.deleteMany();
  await prisma.task.deleteMany();
  await prisma.job.deleteMany();
  await prisma.property.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 12);

  // ─────────────────────────────────────────────
  // USERS - Construction company hierarchy
  // ─────────────────────────────────────────────

  const owner = await prisma.user.create({
    data: {
      email: 'tony.russo@ledgra.com',
      password,
      name: 'Tony Russo',
      role: 'ADMIN',
      department: 'Executive',
    },
  });

  const officeManager = await prisma.user.create({
    data: {
      email: 'maria.santos@ledgra.com',
      password,
      name: 'Maria Santos',
      role: 'ADMIN',
      department: 'Office',
      managerId: owner.id,
    },
  });

  const bookkeeper = await prisma.user.create({
    data: {
      email: 'janet.lee@ledgra.com',
      password,
      name: 'Janet Lee',
      role: 'APPROVER',
      department: 'Finance',
      managerId: officeManager.id,
    },
  });

  const pmMike = await prisma.user.create({
    data: {
      email: 'mike.chen@ledgra.com',
      password,
      name: 'Mike Chen',
      role: 'APPROVER',
      department: 'Project Management',
      managerId: owner.id,
    },
  });

  const pmSarah = await prisma.user.create({
    data: {
      email: 'sarah.johnson@ledgra.com',
      password,
      name: 'Sarah Johnson',
      role: 'APPROVER',
      department: 'Project Management',
      managerId: owner.id,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      email: 'carlos.rivera@ledgra.com',
      password,
      name: 'Carlos Rivera',
      role: 'EMPLOYEE',
      department: 'Field Operations',
      managerId: pmMike.id,
    },
  });

  const foreman = await prisma.user.create({
    data: {
      email: 'james.miller@ledgra.com',
      password,
      name: 'James Miller',
      role: 'EMPLOYEE',
      department: 'Field Operations',
      managerId: pmMike.id,
    },
  });

  const electrician = await prisma.user.create({
    data: {
      email: 'dave.wilson@ledgra.com',
      password,
      name: 'Dave Wilson',
      role: 'EMPLOYEE',
      department: 'Electrical',
      managerId: pmSarah.id,
    },
  });

  const plumber = await prisma.user.create({
    data: {
      email: 'raj.patel@ledgra.com',
      password,
      name: 'Raj Patel',
      role: 'EMPLOYEE',
      department: 'Plumbing',
      managerId: pmSarah.id,
    },
  });

  const carpenter = await prisma.user.create({
    data: {
      email: 'tom.baker@ledgra.com',
      password,
      name: 'Tom Baker',
      role: 'EMPLOYEE',
      department: 'Carpentry',
      managerId: pmMike.id,
    },
  });

  console.log('✓ Created 10 users (construction hierarchy)');

  // ─────────────────────────────────────────────
  // EXPENSE CATEGORIES
  // ─────────────────────────────────────────────

  const catMaterials = await prisma.expenseCategory.create({
    data: { name: 'Materials', icon: '🪵', sortOrder: 1 },
  });
  const catLabor = await prisma.expenseCategory.create({
    data: { name: 'Labor', icon: '👷', sortOrder: 2 },
  });
  const catEquipment = await prisma.expenseCategory.create({
    data: { name: 'Equipment Rental', icon: '🏗️', sortOrder: 3 },
  });
  const catSubcontractor = await prisma.expenseCategory.create({
    data: { name: 'Subcontractor', icon: '🤝', sortOrder: 4 },
  });
  const catPermits = await prisma.expenseCategory.create({
    data: { name: 'Permits & Fees', icon: '📋', sortOrder: 5 },
  });
  const catTravel = await prisma.expenseCategory.create({
    data: { name: 'Travel', icon: '🚗', sortOrder: 6 },
  });
  const catOther = await prisma.expenseCategory.create({
    data: { name: 'Other', icon: '📦', sortOrder: 7 },
  });

  console.log('✓ Created 7 expense categories');

  // ─────────────────────────────────────────────
  // PROPERTIES > JOBS > TASKS
  // ─────────────────────────────────────────────

  const propMain = await prisma.property.create({
    data: {
      name: '123 Main St Renovation',
      address: '123 Main Street, Austin, TX 78701',
      clientName: 'Henderson Family',
      status: 'ACTIVE',
      budget: 150000,
    },
  });

  const propOak = await prisma.property.create({
    data: {
      name: '456 Oak Ave New Build',
      address: '456 Oak Avenue, Austin, TX 78704',
      clientName: 'Parkside Development LLC',
      status: 'ACTIVE',
      budget: 280000,
    },
  });

  const propElm = await prisma.property.create({
    data: {
      name: '789 Elm Dr Remodel',
      address: '789 Elm Drive, Austin, TX 78745',
      clientName: 'Williams Residence',
      status: 'COMPLETED',
      budget: 85000,
    },
  });

  // Jobs for 123 Main St
  const jobKitchen = await prisma.job.create({
    data: { propertyId: propMain.id, name: 'Kitchen Remodel', budget: 45000, description: 'Full kitchen renovation including cabinets, countertops, and appliances' },
  });
  const jobBathroom = await prisma.job.create({
    data: { propertyId: propMain.id, name: 'Master Bathroom', budget: 28000, description: 'Master bath renovation with new tile, vanity, and fixtures' },
  });
  const jobElectrical = await prisma.job.create({
    data: { propertyId: propMain.id, name: 'Electrical Upgrade', budget: 18000, description: 'Panel upgrade and rewiring for modern code compliance' },
  });

  // Tasks for Kitchen
  const taskCabinets = await prisma.task.create({
    data: { jobId: jobKitchen.id, name: 'Install Cabinets', budget: 15000 },
  });
  const taskCounters = await prisma.task.create({
    data: { jobId: jobKitchen.id, name: 'Pour Countertops', budget: 8000 },
  });
  const taskAppliances = await prisma.task.create({
    data: { jobId: jobKitchen.id, name: 'Install Appliances', budget: 12000 },
  });

  // Tasks for Bathroom
  const taskTile = await prisma.task.create({
    data: { jobId: jobBathroom.id, name: 'Tile Work', budget: 10000 },
  });
  const taskVanity = await prisma.task.create({
    data: { jobId: jobBathroom.id, name: 'Vanity & Fixtures', budget: 8000 },
  });

  // Tasks for Electrical
  const taskPanel = await prisma.task.create({
    data: { jobId: jobElectrical.id, name: 'Panel Upgrade', budget: 6000 },
  });
  const taskWiring = await prisma.task.create({
    data: { jobId: jobElectrical.id, name: 'Rewiring', budget: 10000 },
  });

  // Jobs for 456 Oak Ave
  const jobFraming = await prisma.job.create({
    data: { propertyId: propOak.id, name: 'Framing', budget: 65000, description: 'Structural framing for 3-bedroom home' },
  });
  const jobFoundation = await prisma.job.create({
    data: { propertyId: propOak.id, name: 'Foundation', budget: 45000, description: 'Concrete foundation and slab work' },
  });
  const jobRoofing = await prisma.job.create({
    data: { propertyId: propOak.id, name: 'Roofing', budget: 32000, description: 'Full roof installation' },
  });

  // Tasks for Framing
  await prisma.task.create({ data: { jobId: jobFraming.id, name: 'Wall Framing', budget: 35000 } });
  await prisma.task.create({ data: { jobId: jobFraming.id, name: 'Roof Trusses', budget: 20000 } });

  // Tasks for Foundation
  await prisma.task.create({ data: { jobId: jobFoundation.id, name: 'Excavation', budget: 12000 } });
  await prisma.task.create({ data: { jobId: jobFoundation.id, name: 'Concrete Pour', budget: 28000 } });

  // Jobs for 789 Elm (completed)
  const jobPainting = await prisma.job.create({
    data: { propertyId: propElm.id, name: 'Interior Painting', budget: 12000, status: 'COMPLETED' },
  });
  const jobFlooring = await prisma.job.create({
    data: { propertyId: propElm.id, name: 'Hardwood Flooring', budget: 22000, status: 'COMPLETED' },
  });

  console.log('✓ Created 3 properties, 8 jobs, 10+ tasks');

  // ─────────────────────────────────────────────
  // APPROVAL WORKFLOWS
  // ─────────────────────────────────────────────

  const defaultWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Manager Approval',
      type: 'MANAGER_CHAIN',
      isDefault: true,
      conditions: JSON.stringify({ description: 'All expenses to direct manager' }),
      steps: { create: [{ stepOrder: 0, isRequired: true }] },
    },
  });

  const highValueWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'High Value (Over $2,000)',
      type: 'SEQUENTIAL',
      conditions: JSON.stringify({ minAmount: 2000 }),
      steps: {
        create: [
          { stepOrder: 0, isRequired: true },
          { approverId: bookkeeper.id, stepOrder: 1, isRequired: true },
          { approverId: owner.id, stepOrder: 2, isRequired: true, amountThreshold: 5000 },
        ],
      },
    },
  });

  console.log('✓ Created 2 approval workflows');

  // ─────────────────────────────────────────────
  // AUTO-APPROVAL RULES
  // ─────────────────────────────────────────────

  await prisma.autoApprovalRule.create({
    data: {
      name: 'Small material purchases',
      maxAmount: 200,
      categoryId: catMaterials.id,
      priority: 10,
    },
  });

  await prisma.autoApprovalRule.create({
    data: {
      name: 'Permits under $500',
      maxAmount: 500,
      categoryId: catPermits.id,
      priority: 5,
    },
  });

  await prisma.autoApprovalRule.create({
    data: {
      name: 'Small travel expenses',
      maxAmount: 100,
      categoryId: catTravel.id,
      priority: 3,
    },
  });

  console.log('✓ Created 3 auto-approval rules');

  // ─────────────────────────────────────────────
  // UNIFIED APPROVAL POLICIES
  // ─────────────────────────────────────────────

  await prisma.approvalPolicy.create({
    data: {
      name: 'Small Material Purchases',
      description: 'Auto-approve material expenses under $200',
      actionType: 'AUTO_APPROVE',
      maxAmount: 200,
      categoryId: catMaterials.id,
      priority: 10,
    },
  });

  await prisma.approvalPolicy.create({
    data: {
      name: 'Permits Under $500',
      description: 'Auto-approve permit fees under $500',
      actionType: 'AUTO_APPROVE',
      maxAmount: 500,
      categoryId: catPermits.id,
      priority: 5,
    },
  });

  await prisma.approvalPolicy.create({
    data: {
      name: 'Small Travel Expenses',
      description: 'Auto-approve travel under $100',
      actionType: 'AUTO_APPROVE',
      maxAmount: 100,
      categoryId: catTravel.id,
      priority: 3,
    },
  });

  await prisma.approvalPolicy.create({
    data: {
      name: 'High Value Review',
      description: 'Expenses over $2,000 need owner + bookkeeper approval',
      actionType: 'ROUTE_TO_APPROVERS',
      minAmount: 2000,
      routingType: 'SEQUENTIAL',
      priority: 1,
      steps: {
        create: [
          { approverId: bookkeeper.id, stepOrder: 0, isRequired: true },
          { approverId: owner.id, stepOrder: 1, isRequired: true },
        ],
      },
    },
  });

  await prisma.approvalPolicy.create({
    data: {
      name: 'Standard Approval',
      description: 'Default: route to project manager for review',
      actionType: 'ROUTE_TO_APPROVERS',
      routingType: 'SEQUENTIAL',
      priority: 0,
      steps: {
        create: [
          { approverId: pmMike.id, stepOrder: 0, isRequired: true },
        ],
      },
    },
  });

  console.log('✓ Created 5 approval policies');

  // ─────────────────────────────────────────────
  // EXPENSES
  // ─────────────────────────────────────────────

  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  const expenses = [
    // Carpenter - Tom Baker
    {
      userId: carpenter.id,
      title: 'Lumber for Kitchen Cabinets',
      description: 'Oak and maple lumber from Home Depot for custom cabinet frames',
      totalAmount: 2340.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobKitchen.id,
      taskId: taskCabinets.id,
      submittedAt: daysAgo(20),
      approvedAt: daysAgo(18),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Oak boards (24 pcs)', amount: 1440.00 },
        { description: 'Maple trim (12 pcs)', amount: 600.00 },
        { description: 'Wood screws and hardware', amount: 180.00 },
        { description: 'Wood glue and finish', amount: 120.00 },
      ],
    },
    {
      userId: carpenter.id,
      title: 'Cabinet Hardware',
      description: 'Handles and hinges for kitchen cabinets',
      totalAmount: 156.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobKitchen.id,
      taskId: taskCabinets.id,
      submittedAt: daysAgo(12),
      approvedAt: daysAgo(12),
      autoApproved: true,
      items: [
        { description: 'Brushed nickel handles (20)', amount: 100.00 },
        { description: 'Soft-close hinges (40)', amount: 56.00 },
      ],
    },
    {
      userId: carpenter.id,
      title: 'Countertop Materials',
      description: 'Quartz slab from Stone Center for kitchen counters',
      totalAmount: 4200.00,
      category: 'Materials',
      status: 'PENDING',
      propertyId: propMain.id,
      jobId: jobKitchen.id,
      taskId: taskCounters.id,
      submittedAt: daysAgo(2),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Quartz slab (Calacatta)', amount: 3600.00 },
        { description: 'Fabrication and edge profile', amount: 450.00 },
        { description: 'Sink cutout', amount: 150.00 },
      ],
    },

    // Electrician - Dave Wilson
    {
      userId: electrician.id,
      title: 'Electrical Panel & Breakers',
      description: '200-amp panel and breakers for panel upgrade',
      totalAmount: 1850.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobElectrical.id,
      taskId: taskPanel.id,
      submittedAt: daysAgo(30),
      approvedAt: daysAgo(28),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'Square D 200A panel', amount: 850.00 },
        { description: 'Circuit breakers (assorted)', amount: 620.00 },
        { description: 'Romex wire (various gauges)', amount: 280.00 },
        { description: 'Conduit and fittings', amount: 100.00 },
      ],
    },
    {
      userId: electrician.id,
      title: 'Building Permit - Electrical',
      description: 'City of Austin electrical permit for panel upgrade',
      totalAmount: 375.00,
      category: 'Permits & Fees',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobElectrical.id,
      submittedAt: daysAgo(35),
      approvedAt: daysAgo(35),
      autoApproved: true,
      items: [
        { description: 'Electrical permit - residential', amount: 375.00 },
      ],
    },
    {
      userId: electrician.id,
      title: 'Lighting Fixtures',
      description: 'Recessed LED lights and fixtures for kitchen remodel',
      totalAmount: 680.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobKitchen.id,
      submittedAt: daysAgo(15),
      approvedAt: daysAgo(13),
      workflowId: defaultWorkflow.id,
      items: [
        { description: '6" LED recessed lights (12)', amount: 480.00 },
        { description: 'Under-cabinet LED strips', amount: 120.00 },
        { description: 'Dimmer switches (3)', amount: 80.00 },
      ],
    },

    // Plumber - Raj Patel
    {
      userId: plumber.id,
      title: 'Bathroom Fixtures & Pipe',
      description: 'PEX piping and fixtures for master bathroom renovation',
      totalAmount: 2150.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propMain.id,
      jobId: jobBathroom.id,
      taskId: taskVanity.id,
      submittedAt: daysAgo(22),
      approvedAt: daysAgo(20),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Double vanity (60")', amount: 1200.00 },
        { description: 'Delta faucets (2)', amount: 380.00 },
        { description: 'PEX pipe and fittings', amount: 290.00 },
        { description: 'Toilet (Kohler)', amount: 280.00 },
      ],
    },
    {
      userId: plumber.id,
      title: 'Tile for Master Bath',
      description: 'Porcelain tile for shower walls and floor',
      totalAmount: 1680.00,
      category: 'Materials',
      status: 'PENDING',
      propertyId: propMain.id,
      jobId: jobBathroom.id,
      taskId: taskTile.id,
      submittedAt: daysAgo(3),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'Porcelain wall tile (120 sq ft)', amount: 840.00 },
        { description: 'Floor tile (mosaic)', amount: 480.00 },
        { description: 'Thinset, grout, and backer board', amount: 260.00 },
        { description: 'Waterproofing membrane', amount: 100.00 },
      ],
    },

    // Supervisor - Carlos Rivera
    {
      userId: supervisor.id,
      title: 'Excavator Rental - Foundation',
      description: '3-day mini excavator rental for foundation dig at Oak Ave',
      totalAmount: 1200.00,
      category: 'Equipment Rental',
      status: 'APPROVED',
      propertyId: propOak.id,
      jobId: jobFoundation.id,
      submittedAt: daysAgo(40),
      approvedAt: daysAgo(38),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'CAT 303.5 excavator (3 days @ $350)', amount: 1050.00 },
        { description: 'Delivery and pickup', amount: 150.00 },
      ],
    },
    {
      userId: supervisor.id,
      title: 'Concrete for Foundation',
      description: 'Ready-mix concrete for foundation slab pour',
      totalAmount: 8500.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propOak.id,
      jobId: jobFoundation.id,
      submittedAt: daysAgo(35),
      approvedAt: daysAgo(32),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Ready-mix concrete (25 yards @ $280)', amount: 7000.00 },
        { description: 'Rebar and mesh', amount: 1100.00 },
        { description: 'Form lumber', amount: 400.00 },
      ],
    },
    {
      userId: supervisor.id,
      title: 'Framing Lumber Delivery',
      description: 'Structural lumber for wall framing at Oak Ave',
      totalAmount: 12400.00,
      category: 'Materials',
      status: 'APPROVED',
      propertyId: propOak.id,
      jobId: jobFraming.id,
      submittedAt: daysAgo(25),
      approvedAt: daysAgo(22),
      workflowId: highValueWorkflow.id,
      items: [
        { description: '2x4 studs (500 pcs)', amount: 4500.00 },
        { description: '2x6 joists (200 pcs)', amount: 3600.00 },
        { description: 'LVL beams (4)', amount: 2800.00 },
        { description: 'Plywood sheathing (80 sheets)', amount: 1200.00 },
        { description: 'Nails, screws, brackets', amount: 300.00 },
      ],
    },
    {
      userId: supervisor.id,
      title: 'Crane Rental - Roof Trusses',
      description: 'Half-day crane for setting roof trusses at Oak Ave',
      totalAmount: 1800.00,
      category: 'Equipment Rental',
      status: 'PENDING',
      propertyId: propOak.id,
      jobId: jobRoofing.id,
      submittedAt: daysAgo(1),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'Crane rental (half day)', amount: 1500.00 },
        { description: 'Operator fee', amount: 300.00 },
      ],
    },

    // Foreman - James Miller
    {
      userId: foreman.id,
      title: 'Subcontractor - HVAC Install',
      description: 'Cool Air LLC - AC and ductwork installation for Oak Ave new build',
      totalAmount: 15800.00,
      category: 'Subcontractor',
      status: 'APPROVED',
      propertyId: propOak.id,
      submittedAt: daysAgo(18),
      approvedAt: daysAgo(15),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'HVAC system (3-ton Carrier)', amount: 8500.00 },
        { description: 'Ductwork installation', amount: 4800.00 },
        { description: 'Thermostat and controls', amount: 1200.00 },
        { description: 'Permits and inspections', amount: 1300.00 },
      ],
    },
    {
      userId: foreman.id,
      title: 'Safety Equipment',
      description: 'Hard hats, vests, and fall protection gear for crew',
      totalAmount: 485.00,
      category: 'Other',
      status: 'APPROVED',
      submittedAt: daysAgo(45),
      approvedAt: daysAgo(43),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'Hard hats (10)', amount: 150.00 },
        { description: 'Safety vests (10)', amount: 85.00 },
        { description: 'Fall harnesses (3)', amount: 180.00 },
        { description: 'First aid kits (2)', amount: 70.00 },
      ],
    },
    {
      userId: foreman.id,
      title: 'Fuel for Company Truck',
      description: 'Gas fill-ups for site visits this week',
      totalAmount: 78.50,
      category: 'Travel',
      status: 'APPROVED',
      submittedAt: daysAgo(5),
      approvedAt: daysAgo(5),
      autoApproved: true,
      items: [
        { description: 'Shell gas station - 21.5 gal', amount: 78.50 },
      ],
    },
    {
      userId: foreman.id,
      title: 'Building Permit - New Construction',
      description: 'City of Austin building permit for 456 Oak Ave new build',
      totalAmount: 2800.00,
      category: 'Permits & Fees',
      status: 'APPROVED',
      propertyId: propOak.id,
      submittedAt: daysAgo(50),
      approvedAt: daysAgo(47),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Building permit fee', amount: 2200.00 },
        { description: 'Plan review fee', amount: 600.00 },
      ],
    },

    // PM Mike - inspection/travel
    {
      userId: pmMike.id,
      title: 'Mileage - Site Visits',
      description: 'Site inspection drives for the week (Main St and Oak Ave)',
      totalAmount: 62.50,
      category: 'Travel',
      status: 'APPROVED',
      submittedAt: daysAgo(7),
      approvedAt: daysAgo(7),
      autoApproved: true,
      items: [
        { description: 'Mileage reimbursement (100 mi @ $0.625)', amount: 62.50 },
      ],
    },

    // Draft / Changes Requested
    {
      userId: electrician.id,
      title: 'Smart Home Wiring',
      description: 'Cat6 cable and smart switches for Oak Ave new build',
      totalAmount: 920.00,
      category: 'Materials',
      status: 'DRAFT',
      propertyId: propOak.id,
      items: [
        { description: 'Cat6 cable (1000 ft)', amount: 280.00 },
        { description: 'Network jacks and plates (20)', amount: 140.00 },
        { description: 'Smart light switches (15)', amount: 500.00 },
      ],
    },
    {
      userId: plumber.id,
      title: 'Roofing Materials',
      description: 'Shingles and underlayment for Oak Ave roof',
      totalAmount: 5400.00,
      category: 'Materials',
      status: 'CHANGES_REQUESTED',
      propertyId: propOak.id,
      jobId: jobRoofing.id,
      submittedAt: daysAgo(4),
      workflowId: defaultWorkflow.id,
      items: [
        { description: 'Architectural shingles (60 bundles)', amount: 3600.00 },
        { description: 'Synthetic underlayment', amount: 800.00 },
        { description: 'Ridge vent and flashing', amount: 600.00 },
        { description: 'Roofing nails (50 lbs)', amount: 400.00 },
      ],
    },

    // Completed project (789 Elm) - PAID
    {
      userId: carpenter.id,
      title: 'Hardwood Flooring - Elm Dr',
      description: 'Red oak hardwood flooring for main living area',
      totalAmount: 6800.00,
      category: 'Materials',
      status: 'PAID',
      propertyId: propElm.id,
      jobId: jobFlooring.id,
      submittedAt: daysAgo(90),
      approvedAt: daysAgo(87),
      paidAt: daysAgo(80),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Red oak flooring (800 sq ft)', amount: 5200.00 },
        { description: 'Floor adhesive', amount: 320.00 },
        { description: 'Transitions and trim', amount: 480.00 },
        { description: 'Floor sander rental', amount: 280.00 },
        { description: 'Stain and polyurethane', amount: 520.00 },
      ],
    },
    {
      userId: supervisor.id,
      title: 'Interior Paint - Elm Dr',
      description: 'Paint and supplies for whole-house interior repaint',
      totalAmount: 3200.00,
      category: 'Materials',
      status: 'PAID',
      propertyId: propElm.id,
      jobId: jobPainting.id,
      submittedAt: daysAgo(85),
      approvedAt: daysAgo(83),
      paidAt: daysAgo(75),
      workflowId: highValueWorkflow.id,
      items: [
        { description: 'Sherwin-Williams paint (25 gal)', amount: 1750.00 },
        { description: 'Primer (10 gal)', amount: 400.00 },
        { description: 'Rollers, brushes, tape', amount: 250.00 },
        { description: 'Drop cloths and supplies', amount: 100.00 },
        { description: 'Painter labor (subcontractor)', amount: 700.00 },
      ],
    },
  ];

  for (const exp of expenses) {
    const { items, ...expenseData } = exp;
    await prisma.expense.create({
      data: {
        ...expenseData,
        items: { create: items },
      },
    });
  }

  console.log(`✓ Created ${expenses.length} expenses`);

  // ─────────────────────────────────────────────
  // APPROVAL ACTIONS
  // ─────────────────────────────────────────────

  const approvedExpenses = await prisma.expense.findMany({
    where: { status: { in: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'PAID'] } },
    include: { user: { include: { manager: true } } },
  });

  for (const expense of approvedExpenses) {
    const approver = expense.user.manager || bookkeeper;

    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      if (!expense.autoApproved) {
        await prisma.approvalAction.create({
          data: {
            expenseId: expense.id,
            approverId: approver.id,
            action: 'APPROVED',
            comments: expense.totalAmount > 2000 ? 'Reviewed and approved. Verified against project budget.' : 'Approved.',
            stepNumber: 0,
            createdAt: expense.approvedAt || new Date(),
          },
        });

        if (expense.totalAmount >= 5000) {
          await prisma.approvalAction.create({
            data: {
              expenseId: expense.id,
              approverId: owner.id,
              action: 'APPROVED',
              comments: 'Owner approved - large expense verified against project scope.',
              stepNumber: 2,
              createdAt: expense.approvedAt || new Date(),
            },
          });
        }
      }
    } else if (expense.status === 'CHANGES_REQUESTED') {
      await prisma.approvalAction.create({
        data: {
          expenseId: expense.id,
          approverId: approver.id,
          action: 'CHANGES_REQUESTED',
          comments: 'Please attach the supplier invoice and confirm this matches the project estimate.',
          stepNumber: 0,
          createdAt: daysAgo(3),
        },
      });
    }
  }

  console.log('✓ Created approval actions');

  // ─────────────────────────────────────────────
  // PAYOUTS (for PAID expenses)
  // ─────────────────────────────────────────────

  const paidExpenses = await prisma.expense.findMany({
    where: { status: 'PAID' },
  });

  for (const expense of paidExpenses) {
    await prisma.payout.create({
      data: {
        expenseId: expense.id,
        amount: expense.totalAmount,
        paymentMethod: 'CHECK',
        referenceNumber: `CHK-${Math.floor(10000 + Math.random() * 90000)}`,
        notes: 'Processed in weekly payout batch',
        paidById: officeManager.id,
        createdAt: expense.paidAt || new Date(),
      },
    });
  }

  console.log('✓ Created payouts for paid expenses');

  // ─────────────────────────────────────────────
  // BUDGET ALERTS
  // ─────────────────────────────────────────────

  await prisma.budgetAlert.create({
    data: { propertyId: propMain.id, thresholdPct: 80 },
  });
  await prisma.budgetAlert.create({
    data: { propertyId: propOak.id, thresholdPct: 85 },
  });
  await prisma.budgetAlert.create({
    data: { jobId: jobKitchen.id, thresholdPct: 90 },
  });

  console.log('✓ Created budget alerts');

  // ─────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🎉 Database seeded successfully!\n');
  console.log('🏗️  CONSTRUCTION COMPANY HIERARCHY:');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('Owner: Tony Russo (ADMIN)');
  console.log('├── Office Manager: Maria Santos (ADMIN)');
  console.log('│   └── Bookkeeper: Janet Lee (APPROVER)');
  console.log('├── PM: Mike Chen (APPROVER)');
  console.log('│   ├── Supervisor: Carlos Rivera (EMPLOYEE)');
  console.log('│   ├── Foreman: James Miller (EMPLOYEE)');
  console.log('│   └── Carpenter: Tom Baker (EMPLOYEE)');
  console.log('└── PM: Sarah Johnson (APPROVER)');
  console.log('    ├── Electrician: Dave Wilson (EMPLOYEE)');
  console.log('    └── Plumber: Raj Patel (EMPLOYEE)');
  console.log('');
  console.log('🔑 TEST ACCOUNTS (password: password123):');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('Admin:     tony.russo@ledgra.com (Owner)');
  console.log('Admin:     maria.santos@ledgra.com (Office Manager)');
  console.log('Approver:  mike.chen@ledgra.com (Project Manager)');
  console.log('Employee:  james.miller@ledgra.com (Foreman)');
  console.log('Employee:  tom.baker@ledgra.com (Carpenter)');
  console.log('Employee:  dave.wilson@ledgra.com (Electrician)');
  console.log('');
  console.log('🏠 PROPERTIES:');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('• 123 Main St Renovation — $150k budget (Active)');
  console.log('• 456 Oak Ave New Build   — $280k budget (Active)');
  console.log('• 789 Elm Dr Remodel      — $85k budget (Completed)');
  console.log('');
  console.log('⚡ AUTO-APPROVAL RULES:');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('• Materials under $200 → Auto-approved');
  console.log('• Permits under $500   → Auto-approved');
  console.log('• Travel under $100    → Auto-approved');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
