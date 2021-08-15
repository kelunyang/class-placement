import _ from 'lodash';
export async function detectSelection(courseDB, studentDB) {
  for(let i=0; i<courseDB.length; i++) {
    let course = courseDB[i];
    for(let k=0; k<course.placements.length; k++) {
      let students = _.filter(studentDB, (student) => {
        return student.wishes[k] === course.name;
      });
      course.placements[k].students = students;
    }
  }
  return courseDB;
}

export async function startAllocation(courseDB, same) {
  for(let i=0; i<courseDB.length; i++) {
    let course = courseDB[i];
    course.selectedStd = [];
    for(let k=0; k<course.placements.length; k++) {
      if(same) {
        course.placements[k].students = _.filter(course.placements[k].students, (student) => {
                      return student.lastTaken !== course.name;
                    })
      }
      let placement = course.placements[k].students;
      placement = _.filter(placement, (student) => {
        return student.selectedCourse === undefined;
      });
      if(course.limit > course.selectedStd.length) {
        if(course.rankingList.length === 0) {
          placement = _.shuffle(placement);
        } else {
          placement = _.orderBy(placement, [(student) => {
            let sValue = _.find(course.rankingList, (score) => {
              return student.id === score.student.id;
            });
            return sValue === undefined ? 0 : sValue.score;
          }], ["desc"]);
        }
        let slice = course.limit - course.selectedStd.length > 0 ? course.limit - course.selectedStd.length : 0;
        placement = _.slice(placement, 0, slice);
        course.selectedStd = _.unionWith(course.selectedStd, placement, (aStd, bStd) => {
          return aStd.id === bStd.id;
        });
        for(let o=0; o<course.selectedStd.length; o++) {
          let student = course.selectedStd[o];
          if(student.selectedOrder === 0) {
            student.selectedOrder = k + 1;
            student.selectedCourse = course;
          }
        }
      }
    }
  }
  return courseDB;
}

export async function forceAllocation(courseDB, studentDB) {
  for(let i=0; i<courseDB.length; i++) {
    let course = courseDB[i];
    if(course.selectedStd.length < courseDB[i].limit) {
      let remainStd = _.slice(_.shuffle(_.filter(studentDB, (student) => {
        return student.selectedCourse === undefined;
      })), 0, course.limit - course.selectedStd.length);
      course.selectedStd = _.unionWith(course.selectedStd, remainStd, (aStd, bStd) => {
        return aStd.id === bStd.id;
      });
      for(let k=0; k<course.selectedStd.length; k++) {
        if(course.selectedStd[k].selectedOrder === 0) {
          course.selectedStd[k].selectedOrder = course.placements.length + 1;
          course.selectedStd[k].selectedCourse = course;
        }
      }
    }
  }
  return courseDB;
}

export async function studentMapping(courseDB, studentDB) {
  for(let i=0; i<courseDB.length; i++) {
    let course = courseDB[i];
    for(let k=0; k<course.selectedStd.length; k++) {
      let student = _.find(studentDB, (std) => {
        return std.id === course.selectedStd[k].id;
      })
      if(student !== undefined) {
        student.selectedOrder = course.selectedStd[k].selectedOrder;
        student.selectedCourse = course.selectedStd[k].selectedCourse;
      }
    }
  }
  return studentDB;
}