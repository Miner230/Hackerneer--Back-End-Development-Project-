// Loads and displays the current user's dice stats using passed-in API data
function loadDiceInfo(data) {
	const diceDiv = document.getElementById('diceInfo');

	// check for missing or invalid dice stats
	if (!data || !data.rows) {
		diceDiv.innerHTML = `<div class="text-danger text-center">Failed to load dice data.</div>`;
		return;
	}

	const stats = data.rows;
	const user = Array.isArray(data.user_data) ? data.user_data[0] : null;
	const drPenetration = Number(user?.damage_reduction_penetration || 0);

	diceDiv.innerHTML = `
    <div class="card mb-4 p-3 profile-card text-light">
      <div class="row align-items-center g-3">
          <h4 class="text-center mb-3 rpg-heading">Dice Stats</h4>
          <ul class="list-group list-group-flush bg-transparent stat-list">
            <li class="list-group-item d-flex justify-content-between text-success">Level<span>${stats.level}</span></li>
            <li class="list-group-item d-flex justify-content-between">No. of rolls<span>${stats.no_of_rolls}</span></li>
            <li class="list-group-item d-flex justify-content-between text-primary">Duplication Chance ☆<span>${stats.duplication_chance}</span></li>
            <li class="list-group-item d-flex justify-content-between text-primary">Duplication Number ✵<span>${stats.duplication_number}</span></li>
            <li class="list-group-item d-flex justify-content-between text-danger">Critical Chance ☣<span>${stats.crit_chance}</span></li>
            <li class="list-group-item d-flex justify-content-between text-danger">Critical Power ☠︎︎<span>${stats.crit_power}</span></li>
            <li class="list-group-item d-flex justify-content-between text-warning">DR Penetration ⚔<span>${drPenetration}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 1 Weight<span>${stats.side_1}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 2 Weight<span>${stats.side_2}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 3 Weight<span>${stats.side_3}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 4 Weight<span>${stats.side_4}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 5 Weight<span>${stats.side_5}</span></li>
            <li class="list-group-item d-flex justify-content-between">Side 6 Weight<span>${stats.side_6}</span></li>
          </ul>
      </div>
    </div>
  `;
}
